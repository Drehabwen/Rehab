import type { AssessmentScope } from './store/usePostureAssessmentStore';

export type ViewType = 'front' | 'side' | 'back';

export interface ViewConfig {
  id: ViewType;
  label: string;
  description: string;
  hint: string;
}

const VIEW_CONFIGS: Record<ViewType, ViewConfig> = {
  front: {
    id: 'front',
    label: '正面',
    description: '正面全身站立，用于检测高低肩、骨盆水平',
    hint: '双脚与肩同宽，双手自然下垂'
  },
  side: {
    id: 'side',
    label: '侧面',
    description: '侧面站立，用于检测头前倾、脊柱曲度',
    hint: '侧身面对摄像头，保持身体直立'
  },
  back: {
    id: 'back',
    label: '背面',
    description: '背面全身站立，用于检测背部不对称',
    hint: '背对摄像头，双臂自然下垂'
  }
};

export const SCOPE_VIEWS: Record<AssessmentScope, ViewType[]> = {
  full: ['front', 'side', 'back'],
  upper: ['front', 'side'],
  lower: ['side', 'back']
};

export const getViewsForScope = (scope: AssessmentScope): ViewConfig[] => {
  const viewTypes = SCOPE_VIEWS[scope] || SCOPE_VIEWS.full;
  return viewTypes.map(v => VIEW_CONFIGS[v]);
};

export const getTotalSteps = (scope: AssessmentScope): number => {
  return getViewsForScope(scope).length;
};

export const getNextView = (scope: AssessmentScope, currentView: ViewType): ViewType | null => {
  const views = SCOPE_VIEWS[scope] || SCOPE_VIEWS.full;
  const currentIndex = views.indexOf(currentView);
  
  if (currentIndex === -1 || currentIndex >= views.length - 1) {
    return null;
  }
  
  return views[currentIndex + 1];
};

export const getPreviousView = (scope: AssessmentScope, currentView: ViewType): ViewType | null => {
  const views = SCOPE_VIEWS[scope] || SCOPE_VIEWS.full;
  const currentIndex = views.indexOf(currentView);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return views[currentIndex - 1];
};

export const getViewIndex = (scope: AssessmentScope, view: ViewType): number => {
  const views = SCOPE_VIEWS[scope] || SCOPE_VIEWS.full;
  return views.indexOf(view);
};

export const isFirstView = (scope: AssessmentScope, view: ViewType): boolean => {
  return getViewIndex(scope, view) === 0;
};

export const isLastView = (scope: AssessmentScope, view: ViewType): boolean => {
  const views = SCOPE_VIEWS[scope] || SCOPE_VIEWS.full;
  return getViewIndex(scope, view) === views.length - 1;
};
