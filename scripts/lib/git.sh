get_git_version() {
  pushd $1 > /dev/null
    echo "$(git rev-parse --short HEAD)"
  popd > /dev/null
}