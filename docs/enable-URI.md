
# enable URI format

## build sqlite3

configure using

```shell
CFLAGS="-DSQLITE_USE_URI=1"
```

## build node-sqlite3

see [Uniform Resource Identifiers](https://www.sqlite.org/uri.html)

```shell
SQLITE3_HOME=".../sqlite3"
export LD_RUN_PATH="${SQLITE3_HOME}/lib"

npm install sqlite3 --build-from-source --sqlite="${SQLITE3_HOME} 2>&1 | tee sqlite3.log
ldd node_modules/sqlite3/lib/binding/node-v64-linux-x64/node_sqlite3.node | grep sqlite
```
