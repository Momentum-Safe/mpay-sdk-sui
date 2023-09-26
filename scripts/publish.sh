GIT_COMMIT_SHORT=$(git rev-parse --short HEAD)

cp package.json temp_package.json
yarn publish --non-interactive --prerelease --preid pre-"${GIT_COMMIT_SHORT}" --no-git-tag-version --access public
mv temp_package.json package.json