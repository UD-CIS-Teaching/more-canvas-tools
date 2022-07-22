import * as SITE from "../site";

function pathMatches(r: RegExp): boolean {
    return r.test(document.location.pathname);
}

export const isOnPeoplePage = pathMatches(SITE.PATH.PEOPLE_PAGE)

export const isOnSpeedGrader = pathMatches(SITE.PATH.SPEED_GRADER);

export const isOnSubmission = pathMatches(SITE.PATH.SUBMISSION_PAGE);

export const isOnCanvaDocs = /canvadocs.instructure.com/.test(document.location.hostname);

export const hasLeftNavigation = !isOnSpeedGrader && !isOnCanvaDocs;