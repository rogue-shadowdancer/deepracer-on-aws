$version: "2"

namespace com.aws.solutions.deepracer

structure BatchProfileOperationSummary {
    @required
    total: NonNegativeInteger

    @required
    succeeded: NonNegativeInteger

    @required
    failed: NonNegativeInteger
}

list BatchProfileOperationResultList {
    member: BatchProfileOperationResult
}

structure BatchProfileOperationResult {
    @required
    rowNumber: PositiveInteger

    emailAddress: String

    profileId: ResourceIdentifier

    @required
    status: BatchProfileOperationStatus

    @required
    message: String
}

enum BatchProfileOperationStatus {
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
}
