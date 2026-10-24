import { isAccountUuid } from './utils';
import { normalizeTipCampus } from './tipCampuses';
import { getTipProgram } from './tipPrograms';

export function hasCompleteAccountProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return false;
  }
  const program = getTipProgram(profile.courseId);
  const year = String(profile.year || '').trim();
  return (
    isAccountUuid(profile.accountUuid) &&
    String(profile.name || '').trim().length >= 2 &&
    Boolean(program) &&
    normalizeTipCampus(profile.campus) === program.campus &&
    /^\d{1,2}$/.test(year) &&
    Number(year) >= 1
  );
}
