import { ALWAYS, DOMCONTENTLOADED } from "userscripter/lib/environment";
import { Operation, operation } from "userscripter/lib/operations";
import { loadUserActivityReport } from "./reports/user_activity";

const OPERATIONS: ReadonlyArray<Operation<any>> = [
    operation({
        description: "provide user activity report button",
        condition: ALWAYS,
        dependencies: {},
        action: () => {
            loadUserActivityReport();
        },
        deferUntil: DOMCONTENTLOADED,
    })
];

export default OPERATIONS;
