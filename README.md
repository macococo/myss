myss
====

using the "mysqldump" command, a simple snapshot tool.

Install
=======

wait until register npm module...

```
$ npm install -g myss
```

ENV
=======

| name | description | default |
|:-----|:------------|:--------|
| MYSS_HOME | myss home directory | ~/.myss |
| MYSS_MYSQLDUMP_OPTIONS | mysqldump command option | -u root |

Examples
========

Create snapshot.

```
$ myss add <database name> <snapshot name>
```

list managed databases.

```
$ myss list
```

list snapshots.

```
$ myss list <database name>
```

use snapshot.

```
$ myss use <database name> <snapshot name>
```

delete snapshot.

```
$ myss delete <database name> <snapshot name>
```

delete managed database.

```
$ myss delete <database name>
```
