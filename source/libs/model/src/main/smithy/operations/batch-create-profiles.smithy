$version: "2"

namespace com.aws.solutions.deepracer

@idempotent
@http(method: "POST", uri: "/profiles/batch")
operation BatchCreateProfiles {
    input := {
        @required
        profiles: BatchCreateProfileInputList
    }

    output := {
        @required
        summary: BatchProfileOperationSummary

        @required
        results: BatchProfileOperationResultList
    }
}

@length(min: 1, max: 100)
list BatchCreateProfileInputList {
    member: BatchCreateProfileInput
}

structure BatchCreateProfileInput {
    rowNumber: PositiveInteger

    @required
    emailAddress: String

    alias: Alias

    role: UserGroups

    maxTotalComputeMinutes: Integer

    maxModelCount: Integer
}
