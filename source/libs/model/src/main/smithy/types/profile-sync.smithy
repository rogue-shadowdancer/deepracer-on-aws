$version: "2"

namespace com.aws.solutions.deepracer

structure ProfileSyncOperationSummary {
    @required
    total: NonNegativeInteger

    @required
    unchanged: NonNegativeInteger

    @required
    created: NonNegativeInteger

    @required
    updated: NonNegativeInteger

    @required
    skipped: NonNegativeInteger

    @required
    failed: NonNegativeInteger
}

list ProfileSyncOperationResultList {
    member: ProfileSyncOperationResult
}

structure ProfileSyncOperationResult {
    @required
    rowNumber: PositiveInteger

    profileId: ResourceIdentifier

    emailAddress: String

    @required
    status: ProfileSyncOperationStatus

    @required
    message: String
}

enum ProfileSyncOperationStatus {
    UNCHANGED = "UNCHANGED"
    CREATED = "CREATED"
    UPDATED = "UPDATED"
    SKIPPED = "SKIPPED"
    FAILED = "FAILED"
}
