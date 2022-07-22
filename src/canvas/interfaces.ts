export interface User {
    display_name: string;
    id: number,
    name: string,
    email?: string
}

export type Assignment = {
    id: number,
    published: boolean
}

export enum WorkflowState {
    submitted = "submitted",
    unsubmitted = "unsubmitted",
    graded = "graded",
    pending_review = "pending_review"
}

export interface Submission {
    id: number,
    user: User,
    assignment: Assignment,
    submitted_at: string,
    graded_at: string,
    grader_id: number,
    grade: string,
    score: number,
    late_policy_status: string|null,
    seconds_late: number,
    excused: boolean,
    workflow_state: WorkflowState,
    attachments: SubmissionAttachment[] | null
}

export interface SubmissionAttachment {
    url: string;
}

export type SubmissionGroup = {
    user_id: number,
    submissions: Submission[]
}

export interface SpeedGraderInfo {
    assignmentId: number;
    assignmentTitle: string;
    currentUser: User;
}