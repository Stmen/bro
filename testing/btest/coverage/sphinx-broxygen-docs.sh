# This script checks whether the reST docs generated by broxygen are stale.
# If this test fails, then simply run:
#
#     testing/scripts/gen-broxygen-docs.sh
#
#  and then include the changes in your commit.
#
# @TEST-EXEC: bash $SCRIPTS/gen-broxygen-docs.sh ./doc
# @TEST-EXEC: bash %INPUT

function check_diff
    {
    local file=$1
    echo "Checking $file for differences"
    diff -Nru $DIST/$file $file 1>&2

    if [ $? -ne 0 ]; then
        echo "============================" 1>&2
        echo "$DIST/$file is outdated" 1>&2
        echo "Re-run the following command:" 1>&2
        echo "" 1>&2
        echo "    $SCRIPTS/gen-broxygen-docs.sh" 1>&2
        echo "" 1>&2
        echo "And then include the changes in your commit" 1>&2
        exit 1
    fi
    }

for file in $(find ./doc -name autogenerated-*); do
    check_diff $file
done

check_diff ./doc/scripts
