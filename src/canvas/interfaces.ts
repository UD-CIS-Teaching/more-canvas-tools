export type User = {
    id: number,
    name: string
};
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

export type Submission = {
    id: number,
    user: User,
    assignment: Assignment,
    submitted_at: string,
    graded_at: string,
    grader_id: number,
    score: number,
    workflow_state: WorkflowState,
}

export type SubmissionGroup = {
    user_id: number,
    submissions: Submission[]
}