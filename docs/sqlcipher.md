# using sqlcipher

- install sqlcipher or build your own
- rebuild node-sqlite3 using sqlcipher see [building for sqlcipher](https://github.com/mapbox/node-sqlite3#building-for-sqlcipher)

e.g for Debian/Ubuntu run:

```bash
sudo apt install sqlcipher libsqlcipher-dev
npm install sqlite3 --build-from-source --sqlite_libname=sqlcipher --sqlite=/usr
```
