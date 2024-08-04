import { ALWAYS, DOMCONTENTLOADED, LOAD } from "userscripter/lib/environment";
import { Operation, operation } from "userscripter/lib/operations";
import { isOnAssignment, isOnPeoplePage, isOnSpeedGrader, hasLeftNavigation, isOnCourseHome } from "./canvas/page_checks";
import { loadUserActivityReport } from "./reports/user_activity";
import { injectGraderLabel } from "./utilities/grader_label";
import { injectLimitEnrollmentButton } from "./utilities/limit_enrollment";
import { injectSpreadGradeButton } from "./utilities/spread_grade";
import { injectListUngradedButton } from "./reports/ungraded_report";
import { injectRecentlyEnrolled } from "./reports/recently_enrolled";

const OPERATIONS: ReadonlyArray<Operation<any>> = [
    operation({
        description: "provide user activity report button",
        condition: () => hasLeftNavigation,
        dependencies: {
            sectionTab: "#section-tabs"
        },
        action: () => {
            loadUserActivityReport();
        },
        deferUntil: DOMCONTENTLOADED,
    }),
    operation({
        description: "provide limit section enrollment button",
        condition: () => isOnPeoplePage,
        dependencies: {
            addUserButton: "#addUsers"
        },
        action: (e) => {
            console.log("HELLO EPOPLE", e);
            injectLimitEnrollmentButton();
        },
        deferUntil: DOMCONTENTLOADED
    }),
    operation({
        description: "provide button to spread grade across submissions from speed grader",
        condition: () => isOnSpeedGrader,
        dependencies: {
            gradeBox: "#grading-box-extended"
        },
        action: (e) => {
            injectSpreadGradeButton(e.gradeBox);
        },
        deferUntil: DOMCONTENTLOADED
    }),
    operation({
        description: "label who actually graded an assignment",
        condition: () => isOnSpeedGrader,
        dependencies: {
            gradeBox: "#grading-box-extended"
        },
        action: (e) => {
            injectGraderLabel(e.gradeBox);
        },
        deferUntil: LOAD
    }),
    operation({
        description: "provide button to list ungraded assignments for TAs",
        condition: () => isOnAssignment,
        dependencies: {
            relatedItemsList: "#sidebar_content .page-action-list"
        },
        action: (e) => {
            injectListUngradedButton(e.relatedItemsList);
        },
        deferUntil: DOMCONTENTLOADED
    }),
    operation({
        description: "list recently added/enrolled users for course",
        condition: () => isOnCourseHome,
        dependencies: {
            sidebar: "#right-side-wrapper"
        },
        action: (e) => {
            console.log("HELLO COURSE HOME", e);
            injectRecentlyEnrolled(e.sidebar.querySelector("#right-side"));
        },
        deferUntil: DOMCONTENTLOADED
    })
];

export default OPERATIONS;
