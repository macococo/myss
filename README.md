myss
====

[![Build Status](https://travis-ci.org/macococo/myss.svg?branch=master)](https://travis-ci.org/macococo/myss)
[![NPM version](https://badge.fury.io/js/myss.svg)](http://badge.fury.io/js/myss)
[![Dependency Status](https://david-dm.org/macococo/myss.svg)](https://david-dm.org/macococo/myss)
[![devDependency Status](https://david-dm.org/macococo/myss/dev-status.svg)](https://david-dm.org/macococo/myss#info=devDependencies)

using the "mysqldump" command, a simple snapshot tool.

Install
=======

```
$ npm install -g myss
```

ENV
=======

| name | description | default |
|:-----|:------------|:--------|
| MYSS_HOME | myss home directory | ~/.myss |
| MYSS_MYSQLDUMP_OPTIONS | mysqldump command option | -u root |
| MYSS_MYSQL_OPTIONS | mysql command option | -u root |

Examples
========

add snapshot.

```
$ myss add <database name> <snapshot name>
```

replace snapshot.

```
$ myss replace <database name> <snapshot name>
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
