import { ALWAYS, DOMCONTENTLOADED } from "userscripter/lib/environment";
import { Operation, operation } from "userscripter/lib/operations";
import { isOnPeoplePage } from "./canvas/page_checks";
import { loadUserActivityReport } from "./reports/user_activity";
import { injectLimitEnrollmentButton } from "./utilities/limit_enrollment";

const OPERATIONS: ReadonlyArray<Operation<any>> = [
    operation({
        description: "provide user activity report button",
        condition: ALWAYS,
        dependencies: {},
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
    })
];

export default OPERATIONS;
