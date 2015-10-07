get_md5() {
  if builtin command -v md5 > /dev/null; then
    echo -n "$1" | md5
  elif builtin command -v md5sum > /dev/null ; then
    echo "$1" | md5sum | awk '{print $1}'
  else
    error "Could not find a proper md5 function on the system"
    return 1
  fi
}