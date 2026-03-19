import { useState, useEffect } from 'react';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { JointType, MovementDirection } from '@/types/posture';

const JOINTS: { label: string; value: JointType }[] = [
  { label: '颈椎', value: 'cervical' },
  { label: '肩关节', value: 'shoulder' },
  { label: '胸腰段', value: 'thoracolumbar' },
  { label: '肘关节', value: 'elbow' },
  { label: '腕关节', value: 'wrist' },
  { label: '髋关节', value: 'hip' },
  { label: '膝关节', value: 'knee' },
  { label: '踝关节', value: 'ankle' },
];

const DIRECTIONS: Record<JointType, { label: string; value: MovementDirection }[]> = {
  cervical: [
    { label: '前屈', value: 'flexion' },
    { label: '后伸', value: 'extension' },
    { label: '左旋', value: 'left-rotation' },
    { label: '右旋', value: 'right-rotation' },
    { label: '左侧屈', value: 'left-lateral-flexion' },
    { label: '右侧屈', value: 'right-lateral-flexion' },
  ],
  shoulder: [
    { label: '前屈', value: 'flexion' },
    { label: '后伸', value: 'extension' },
    { label: '外展', value: 'abduction' },
  ],
  thoracolumbar: [
    { label: '前屈', value: 'flexion' },
    { label: '后伸', value: 'extension' },
    { label: '左侧屈', value: 'left-lateral-flexion' },
    { label: '右侧屈', value: 'right-lateral-flexion' },
  ],
  elbow: [
    { label: '前屈', value: 'flexion' },
    { label: '后伸', value: 'extension' },
  ],
  wrist: [
    { label: '前屈', value: 'flexion' },
    { label: '后伸', value: 'extension' },
    { label: '尺偏', value: 'ulnar-deviation' },
    { label: '桡偏', value: 'radial-deviation' },
  ],
  hip: [
    { label: '前屈', value: 'flexion' },
    { label: '后伸', value: 'extension' },
    { label: '外展', value: 'abduction' },
    { label: '内收', value: 'adduction' },
  ],
  knee: [{ label: '前屈', value: 'flexion' }],
  ankle: [
    { label: '背屈', value: 'dorsiflexion' },
    { label: '跖屈', value: 'plantarflexion' },
  ],
};

export default function JointSelector() {
  const { setSingleMeasurement, isMeasuring, activeMeasurements } = useMeasurementStore();
  const [localJoint, setLocalJoint] = useState<JointType>('cervical');
  const [localSide, setLocalSide] = useState<'left' | 'right'>('left');
  const [localDirection, setLocalDirection] = useState<MovementDirection>('flexion');

  useEffect(() => {
    if (activeMeasurements.length > 0) {
      const current = activeMeasurements[0];
      setLocalJoint(current.joint);
      if (current.side) setLocalSide(current.side);
      setLocalDirection(current.direction);
    }
  }, [activeMeasurements]);

  const isSpinal = localJoint === 'cervical' || localJoint === 'thoracolumbar';

  const getSideToSave = (
    joint: JointType,
    direction: MovementDirection,
    side: 'left' | 'right',
  ): 'left' | 'right' | null => {
    const isSpinalJoint = joint === 'cervical' || joint === 'thoracolumbar';
    if (isSpinalJoint && (direction === 'flexion' || direction === 'extension')) {
      return null;
    }
    return side;
  };

  const getDisplayOptions = () => {
    const rawDirections = DIRECTIONS[localJoint] || [];
    if (!isSpinal) return rawDirections;

    const baseMotions = [];
    const hasFlex = rawDirections.find((direction) => direction.value === 'flexion');
    if (hasFlex) baseMotions.push(hasFlex);

    const hasExt = rawDirections.find((direction) => direction.value === 'extension');
    if (hasExt) baseMotions.push(hasExt);

    const hasRotation = rawDirections.some((direction) => direction.value.includes('rotation'));
    if (hasRotation) {
      baseMotions.push({ label: '旋转', value: 'rotation' });
    }

    const hasLateralFlexion = rawDirections.some((direction) => direction.value.includes('lateral-flexion'));
    if (hasLateralFlexion) {
      baseMotions.push({ label: '侧屈', value: 'lateral-flexion' });
    }

    return baseMotions;
  };

  const isSideDisabled = () => {
    if (isSpinal) {
      return localDirection === 'flexion' || localDirection === 'extension';
    }
    return false;
  };

  const getDirectionSelectValue = () => {
    if (isSpinal) {
      if (localDirection.includes('rotation')) return 'rotation';
      if (localDirection.includes('lateral-flexion')) return 'lateral-flexion';
    }
    return localDirection;
  };

  const handleJointChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newJoint = event.target.value as JointType;
    setLocalJoint(newJoint);

    let newDirection = 'flexion' as MovementDirection;
    const isNewSpinal = newJoint === 'cervical' || newJoint === 'thoracolumbar';
    if (!isNewSpinal) {
      const firstDirection = DIRECTIONS[newJoint]?.[0]?.value;
      if (firstDirection) newDirection = firstDirection;
    }

    setLocalDirection(newDirection);
    const sideToSave = getSideToSave(newJoint, newDirection, localSide);
    setSingleMeasurement(newJoint, newDirection, sideToSave);
  };

  const handleSideChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSide = event.target.value as 'left' | 'right';
    setLocalSide(newSide);

    let newDirection = localDirection;
    if (isSpinal) {
      if (localDirection.includes('rotation')) {
        newDirection = newSide === 'left' ? 'left-rotation' : 'right-rotation';
      } else if (localDirection.includes('lateral-flexion')) {
        newDirection = newSide === 'left' ? 'left-lateral-flexion' : 'right-lateral-flexion';
      }
    }

    if (newDirection !== localDirection) {
      setLocalDirection(newDirection);
    }

    const sideToSave = getSideToSave(localJoint, newDirection, newSide);
    setSingleMeasurement(localJoint, newDirection, sideToSave);
  };

  const handleDirectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    let newDirection = value as MovementDirection;

    if (isSpinal) {
      if (value === 'rotation') {
        newDirection = localSide === 'left' ? 'left-rotation' : 'right-rotation';
      } else if (value === 'lateral-flexion') {
        newDirection = localSide === 'left' ? 'left-lateral-flexion' : 'right-lateral-flexion';
      }
    }

    setLocalDirection(newDirection);
    const sideToSave = getSideToSave(localJoint, newDirection, localSide);
    setSingleMeasurement(localJoint, newDirection, sideToSave);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">测量配置</h3>
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
      </div>

      <div className="space-y-5">
        <div className="group">
          <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            选择关节部位
          </label>
          <div className="relative">
            <select
              value={localJoint}
              onChange={handleJointChange}
              disabled={isMeasuring}
              className="block w-full cursor-pointer appearance-none rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm font-medium text-gray-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
            >
              {JOINTS.map((joint) => (
                <option key={joint.value} value={joint.value}>
                  {joint.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="group">
            <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-gray-500">侧别</label>
            <div className="relative">
              <select
                value={localSide}
                onChange={handleSideChange}
                disabled={isMeasuring || isSideDisabled()}
                className="block w-full cursor-pointer appearance-none rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm font-medium text-gray-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-100/50 disabled:opacity-50"
              >
                <option value="left">左侧</option>
                <option value="right">右侧</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group">
            <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-gray-500">动作方向</label>
            <div className="relative">
              <select
                value={getDirectionSelectValue()}
                onChange={handleDirectionChange}
                disabled={isMeasuring}
                className="block w-full cursor-pointer appearance-none rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm font-medium text-gray-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
              >
                {getDisplayOptions().map((direction, index) => (
                  <option key={direction.value || index} value={direction.value}>
                    {direction.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
