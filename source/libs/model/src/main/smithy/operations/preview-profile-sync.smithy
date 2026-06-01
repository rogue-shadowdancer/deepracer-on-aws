$version: "2"

namespace com.aws.solutions.deepracer

@readonly
@http(method: "GET", uri: "/profiles/sync-preview")
operation PreviewProfileSync {
    output := {
        @required
        summary: ProfileSyncOperationSummary

        @required
        results: ProfileSyncOperationResultList
    }
}
