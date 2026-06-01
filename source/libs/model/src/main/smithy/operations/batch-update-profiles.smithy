$version: "2"

namespace com.aws.solutions.deepracer

@http(method: "PATCH", uri: "/profiles/batch")
operation BatchUpdateProfiles {
    input := {
        @required
        updates: BatchUpdateProfileInputList
    }

    output := {
        @required
        summary: BatchProfileOperationSummary

        @required
        results: BatchProfileOperationResultList
    }
}

@length(min: 1, max: 100)
list BatchUpdateProfileInputList {
    member: BatchUpdateProfileInput
}

structure BatchUpdateProfileInput {
    rowNumber: PositiveInteger

    @required
    profileId: ResourceIdentifier

    role: UserGroups

    maxTotalComputeMinutes: Integer

    maxModelCount: Integer
}
