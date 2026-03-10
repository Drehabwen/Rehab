# Unified ROM Core Draft

## Goal

Create one shared ROM definition layer so these concerns stop drifting apart:

- angle extraction
- neutral reference
- normal range
- status classification
- score aggregation
- UI label mapping

Phase 1 should replace the frontend ROM plugin internals without changing the outward report payload shape.

## Proposed File Layout

Place the new core under [src/plugins/rom/core](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/core):

- `schema.ts`
  - shared IDs and definition types
- `definitions.ts`
  - one definition table for joints and motions
- `extractors.ts`
  - pure angle and excursion extraction functions
- `classify.ts`
  - `normal / limited / excessive` rules
- `score.ts`
  - item score, joint score, overall score, summary derivation
- `adapters.ts`
  - compatibility mapping between old plugin names and new core names
- `index.ts`
  - public exports

## Source Of Truth Rules

1. `definitions.ts` becomes the only source of truth for motion semantics.
2. Status should be judged by `peak_excursion` in phase 1.
3. UI may keep current payload fields, but engine logic must not depend on UI labels.
4. Backend parity is phase 2 unless explicitly pulled forward.

## Proposed Schema

```ts
export type ROMJointId =
  | 'cervical'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hip'
  | 'knee'
  | 'ankle';

export type ROMMotionId =
  | 'flexion'
  | 'extension'
  | 'abduction'
  | 'adduction'
  | 'left_rotation'
  | 'right_rotation'
  | 'left_lateral_flexion'
  | 'right_lateral_flexion'
  | 'internal_rotation'
  | 'external_rotation'
  | 'dorsiflexion'
  | 'plantarflexion';

export type ROMSideMode = 'required' | 'optional' | 'forbidden';
export type ROMViewHint = 'front' | 'side' | 'either';
export type ROMBaselineModel =
  | 'same_line'
  | 'straight_line'
  | 'torso_relative'
  | 'transverse_relative';
export type ROMScoringMode = 'peak_excursion';

export interface ROMDefinition {
  joint: ROMJointId;
  motion: ROMMotionId;
  displayLabel: string;
  sideMode: ROMSideMode;
  preferredView: ROMViewHint;
  baselineModel: ROMBaselineModel;
  landmarks: string[];
  normativeRange: { min: number; max: number };
  scoringMode: ROMScoringMode;
  uiAliases?: string[];
  legacyAliases?: string[];
}
```

## Motion Naming Decision

Recommended naming standard for the new core:

- use clinical-direction IDs in snake case
- use explicit laterality for cervical rotation and lateral flexion
- keep `internal_rotation` / `external_rotation` only where the joint is truly modeled that way
- keep adapters for:
  - plugin-local underscore names
  - global/backend hyphenated names

That means:

- new core: `left_rotation`
- current backend/global: `left-rotation`
- current ROM plugin: `internal_rotation` for cervical only

The plugin can keep its current outward strings temporarily, but internally it should map them into the new core IDs.

## Phase 1 Definition Table

These are the definitions worth implementing first.

| Joint | Motion | Side | View | Baseline | Normative Range | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| cervical | flexion | forbidden | side | same_line | 0-80 | use shoulder-mid to hip-mid vs shoulder-mid to ear-mid |
| cervical | extension | forbidden | side | same_line | 0-70 | same extractor as flexion, direction split by sign if available |
| cervical | left_rotation | optional | front | transverse_relative | 0-90 | prefer shoulder line vs ear line plus nose offset |
| cervical | right_rotation | optional | front | transverse_relative | 0-90 | same extractor, opposite sign |
| cervical | left_lateral_flexion | optional | front | torso_relative | 0-45 | compare torso axis and head axis in coronal plane |
| cervical | right_lateral_flexion | optional | front | torso_relative | 0-45 | same extractor, opposite sign |
| shoulder | flexion | required | side | straight_line | 0-180 | humerus vs torso |
| shoulder | extension | required | side | straight_line | 0-60 | humerus vs torso |
| shoulder | abduction | required | front | straight_line | 0-180 | humerus vs torso in frontal plane |
| shoulder | internal_rotation | required | either | torso_relative | 0-70 | phase-1 simplification, may remain limited |
| shoulder | external_rotation | required | either | torso_relative | 0-90 | phase-1 simplification, may remain limited |
| hip | flexion | required | side | straight_line | 0-120 | thigh vs torso |
| hip | extension | required | side | straight_line | 0-30 | thigh vs torso |
| hip | abduction | required | front | straight_line | 0-45 | thigh vs pelvis/torso |
| hip | adduction | required | front | straight_line | 0-30 | thigh vs pelvis/torso |
| knee | flexion | required | side | straight_line | 0-135 | thigh vs shank |
| knee | extension | required | side | straight_line | 0-0 | hyperextension left out in phase 1 |
| ankle | dorsiflexion | required | side | torso_relative | 0-20 | foot vs shank, neutral near 90 degrees |
| ankle | plantarflexion | required | side | torso_relative | 0-50 | foot vs shank |

## Compatibility Mapping

Phase 1 should add an adapter layer instead of changing all consumers immediately.

### Current plugin ROM names

From [src/plugins/rom/types/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/types/index.ts):

- `internal_rotation`
- `external_rotation`
- no `left_rotation`
- no `right_rotation`
- no `dorsiflexion`
- no `plantarflexion`

### Current global/backend names

From [src/types/posture.ts](C:/Users/DORAT/Desktop/Rehab-main/src/types/posture.ts) and [backend/utils/joint_analysis.py](C:/Users/DORAT/Desktop/Rehab-main/backend/utils/joint_analysis.py):

- `left-rotation`
- `right-rotation`
- `left-lateral-flexion`
- `right-lateral-flexion`
- `dorsiflexion`
- `plantarflexion`

### Required adapter behavior

- plugin `internal_rotation` for cervical -> core `left_rotation` or `right_rotation` is not safe without side context
- therefore cervical rotation must be remodeled at the entry-definition layer, not just string-mapped
- underscore IDs and hyphenated IDs should both be normalized before engine evaluation

## Configuration Completeness Audit

Current state is incomplete for a unified ROM system.

### 1. Type Layer

Files:

- [src/plugins/rom/types/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/types/index.ts)
- [src/types/posture.ts](C:/Users/DORAT/Desktop/Rehab-main/src/types/posture.ts)

Problems:

- two incompatible `MovementDirection` vocabularies
- plugin vocabulary is missing lateral flexion and ankle-specific motions
- plugin vocabulary uses underscore names, global vocabulary uses hyphenated names

Decision:

- the new core needs one canonical vocabulary
- old vocabularies should become adapter inputs only

### 2. Range Layer

Files:

- [src/plugins/rom/utils/rom-utils.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/utils/rom-utils.ts)
- [src/constants/standard-ranges.ts](C:/Users/DORAT/Desktop/Rehab-main/src/constants/standard-ranges.ts)

Problems:

- duplicate normal ranges
- cervical ranges conflict materially
- ankle semantics conflict because plugin uses flexion/extension while shared ranges use dorsiflexion/plantarflexion

Decision:

- the new core should own all normative ranges
- legacy helper files should read from the core or be removed

### 3. Entry Configuration Layer

File:

- [src/plugins/rom/components/ROMEntryHub.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/components/ROMEntryHub.tsx)

Problems:

- cervical exposes `internal_rotation / external_rotation` instead of left/right rotation
- ankle exposes `flexion / extension / abduction / adduction`, which does not match backend/global ROM semantics
- knee exposes `abduction / adduction`, which is not part of the current actual measurement model

Decision:

- entry UI should be generated from core definitions, not hand-maintained arrays

### 4. Extraction Layer

Files:

- [src/plugins/rom/hooks/useROMAnalysis.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/hooks/useROMAnalysis.ts)
- [backend/utils/joint_analysis.py](C:/Users/DORAT/Desktop/Rehab-main/backend/utils/joint_analysis.py)

Problems:

- frontend and backend both compute ROM, but not from one shared definition table
- baseline models are implicit in code instead of declared in config
- view assumptions are not encoded anywhere reusable

Decision:

- extractors should be definition-driven
- per-motion extractor choice must come from schema, not switch statements alone

### 5. Status And Score Layer

Files:

- [src/plugins/rom/utils/rom-utils.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/utils/rom-utils.ts)
- [src/plugins/rom/services/ROMService.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/services/ROMService.ts)
- [src/plugins/rom/components/ROMReport.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/components/ROMReport.tsx)

Problems:

- logic is more consistent than before, but still not schema-driven
- score semantics are global and generic, not motion-aware
- no per-definition control over whether status should use peak, current, or another derived value

Decision:

- `score.ts` and `classify.ts` should read only from `ROMDefinition`

### 6. Test Fixture Layer

Current state:

- targeted tests exist for cervical false-positive behavior
- no reusable fixture library for neutral pose / limited ROM / normal ROM / excessive ROM by joint

Decision:

- add deterministic fixture packs once implementation begins

## What Is Missing Today

The current project does not have a complete ROM configuration because these fields are not centralized anywhere:

- canonical motion ID
- preferred view
- side requirement
- landmark set
- neutral reference model
- normative range
- status rule
- scoring basis
- UI alias mapping
- backend alias mapping

Until those exist in one table, the ROM system will keep accumulating translation bugs.

## Recommended Implementation Order

1. Create `schema.ts` and `definitions.ts`.
2. Build `adapters.ts` to normalize old names.
3. Move status and range lookup onto the new definitions.
4. Replace `ROMEntryHub` hand-authored motion arrays with definition-driven rendering.
5. Refactor `useROMAnalysis.ts` to call core extractors.
6. Update report/service code to classify from core outputs.
7. Decide whether backend parity happens immediately or in phase 2.

## Phase 1 Exit Criteria

Phase 1 is complete when:

- ROM plugin renders joint motions from one definition table
- cervical uses left/right rotation and lateral flexion semantics internally
- ankle uses dorsiflexion and plantarflexion semantics internally
- report status and score are derived from the same definition source as realtime measurement
- legacy range tables are no longer independent sources of truth
