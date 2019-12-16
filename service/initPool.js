var mysql = require('mysql');

let init = function () {
	const pool = mysql.createPool({
		host: 'localhost',
		user: 'root',
		password: '',	//pwd
		database: ''	//dbname
	});

	let getPool = function () {
		return pool;
	}
	//同步
	let query_async = function (sql) {
		return new Promise((resolve, reject) => {
			pool.getConnection(function (err, connection) {
				if (err) {
					reject(err)
				} else {
					connection.query(sql, (err, rows) => {
						if (err) {
							reject(err)
						} else {
							resolve(rows)
						}
						connection.release()
					})
				}
			})
		})
	}
	let exp = {
		getPool: getPool,
		query_async: query_async
	}

	return exp;
}

module.exports = {
	init: init
}