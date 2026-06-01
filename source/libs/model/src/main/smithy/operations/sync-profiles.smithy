$version: "2"

namespace com.aws.solutions.deepracer

@idempotent
@http(method: "POST", uri: "/profiles/sync")
operation SyncProfiles {
    output := {
        @required
        summary: ProfileSyncOperationSummary

        @required
        results: ProfileSyncOperationResultList
    }
}
