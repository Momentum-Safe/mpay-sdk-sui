GIT_COMMIT_SHORT=$(git rev-parse --short HEAD)

yarn publish --non-interactive --prerelease --preid experiment-"${GIT_COMMIT_SHORT}" --no-git-tag-version --access public