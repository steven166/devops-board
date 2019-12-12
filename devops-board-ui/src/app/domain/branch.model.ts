import { Buildable } from './build.model';

export interface Branch extends Buildable {

  projectId: string;
  repoId: string;
  branchId: string;
  commit: string;
  isDefault: boolean;
  type: string;

}
