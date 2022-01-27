async function connect(){
    if(global.connection && global.connection.state !== 'disconnected')
        return global.connection;

    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
        host: '',
        user: '',
        password: '',
        database: ''
    });
    global.connection = connection;
    return connection;
}

async function selectApplication(application_id){
    const conn = await connect();
    const sql = 'SELECT * FROM application WHERE application_id = ? LIMIT 1;';
    const values = [application_id];
    const [rows] = await conn.query(sql, values);
    return rows;
}

async function insertApplication(application){
    const conn = await connect();
    const sql = 'INSERT INTO application(application_id, application_name, is_authorized, is_paired) VALUES (?, ?, ?, ?);';
    const values = [application.application_id, application.application_name, application.is_authorized, application.is_paired];
    return await conn.query(sql, values);
}

async function updateApplication(application){
    const conn = await connect();
    const sql = 'UPDATE application SET is_authorized = ?, is_paired = ?, updated = NOW() WHERE application_id = ?;';
    const values = [application.is_authorized, application.is_paired, application.application_id];
    return await conn.query(sql, values);
}

module.exports = {selectApplication, insertApplication, updateApplication}