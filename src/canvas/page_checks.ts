import * as SITE from "../site";

function pathMatches(r: RegExp): boolean {
    return r.test(document.location.pathname);
}

export const isOnPeoplePage = pathMatches(SITE.PATH.PEOPLE_PAGE)