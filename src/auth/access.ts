export type UserRole = 'super_head_coach' | 'head_coach' | 'assistant_medic' | 'athlete_readonly';
export type RuntimeMode = 'coach' | 'sideline';
export type CenterId = 'home' | 'screening' | 'students' | 'reports' | 'alerts' | 'organization';
export type AssessmentTool = 'vision3' | 'medvoice' | 'comparison' | 'rom' | 'training_plan';

export interface AuthContext {
  userId: string;
  role: UserRole;
  teamId: string;
  mode: RuntimeMode;
}

export interface RoleLoginOption {
  value: UserRole;
  label: string;
  description: string;
}

export const ROLE_LOGIN_OPTIONS: RoleLoginOption[] = [
  {
    value: 'assistant_medic',
    label: '筛查执行员',
    description: '负责现场采集、基础筛查、学生建档与结果提交。',
  },
  {
    value: 'head_coach',
    label: '机构管理者',
    description: '负责监控复核、报告发布、复测跟踪与组织管理。',
  },
];

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_head_coach: [
    'settings.read.org',
    'system.read',
    'plan.publish.team',
    'report.create.team',
    'case.read',
    'case.approve',
    'report.publish',
    'report.export',
  ],
  head_coach: [
    'system.read',
    'plan.publish.team',
    'report.create.team',
    'case.read',
    'case.approve',
    'report.publish',
    'report.export',
  ],
  assistant_medic: [
    'system.read',
    'assessment.create.team',
    'assessment.submit.team',
    'record.use',
    'structure.use',
    'case.read',
    'case.write',
    'case.submit',
  ],
  athlete_readonly: ['case.read'],
};

const ROLE_VALUES: UserRole[] = ['super_head_coach', 'head_coach', 'assistant_medic', 'athlete_readonly'];
const MODE_VALUES: RuntimeMode[] = ['coach', 'sideline'];

const getWindow = () => (typeof window === 'undefined' ? null : window);

const readRuntimeValue = (queryKey: string, storageKey: string) => {
  const target = getWindow();
  if (!target) return '';
  const queryValue = new URLSearchParams(target.location.search).get(queryKey)?.trim() ?? '';
  if (queryValue) {
    target.localStorage.setItem(storageKey, queryValue);
    return queryValue;
  }
  return target.localStorage.getItem(storageKey)?.trim() ?? '';
};

export const getRuntimeAuthContext = (): AuthContext => {
  const roleCandidate = readRuntimeValue('role', 'rehab_role');
  const modeCandidate = readRuntimeValue('mode', 'rehab_mode');
  const userId = readRuntimeValue('userId', 'rehab_user_id') || 'system';
  const teamId = readRuntimeValue('teamId', 'rehab_team_id') || 'default-team';
  const role = ROLE_VALUES.includes(roleCandidate as UserRole) ? (roleCandidate as UserRole) : 'head_coach';
  const mode = MODE_VALUES.includes(modeCandidate as RuntimeMode) ? (modeCandidate as RuntimeMode) : 'coach';
  return { userId, role, teamId, mode };
};

export const hasPermission = (role: UserRole, permission: string): boolean => (
  ROLE_PERMISSIONS[role].includes(permission)
);

export const getAllowedCenters = (context: AuthContext): CenterId[] => {
  if (context.mode === 'sideline') {
    return ['screening'];
  }
  if (context.role === 'assistant_medic') {
    return ['home', 'screening', 'students'];
  }
  if (context.role === 'athlete_readonly') {
    return ['students', 'reports'];
  }
  return ['home', 'screening', 'students', 'reports', 'alerts', 'organization'];
};

export const getAllowedTools = (context: AuthContext): AssessmentTool[] => {
  if (context.mode === 'sideline') {
    return ['vision3', 'rom', 'medvoice'];
  }
  if (context.role === 'assistant_medic') {
    return ['vision3', 'rom', 'medvoice'];
  }
  if (context.role === 'athlete_readonly') {
    return [];
  }
  return ['vision3', 'rom', 'medvoice', 'comparison', 'training_plan'];
};

export const canAccessSettings = (context: AuthContext): boolean => (
  context.role === 'super_head_coach'
);

export const canOpenReports = (context: AuthContext): boolean => (
  hasPermission(context.role, 'report.create.team') || context.role === 'athlete_readonly'
);

export const buildAuthHeaders = (): Record<string, string> => {
  const context = getRuntimeAuthContext();
  return {
    'x-user-id': context.userId,
    'x-user-role': context.role,
    'x-team-id': context.teamId,
  };
};

export const withAuthWebSocketUrl = (baseUrl: string): string => {
  const context = getRuntimeAuthContext();
  const url = new URL(baseUrl);
  url.searchParams.set('userId', context.userId);
  url.searchParams.set('role', context.role);
  url.searchParams.set('teamId', context.teamId);
  return url.toString();
};
