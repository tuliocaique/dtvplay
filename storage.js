const fs = require('fs');

function selectApplication(application_id) {
    const path = '../storage/'+application_id+'.json';
    try {
        if (fs.existsSync(path)) {
            const data = fs.readFileSync(path,{encoding:'utf8', flag:'r'});
            return JSON.parse(data);
        } else {
            return false
        }
    } catch(err) {
        return false;
    }
}

function insertApplication(application) {
    const path = '../storage/'+application.application_id+'.json';
    try {
        let content = {
            application_name: application.application_name,
            is_authorized: application.is_authorized,
            is_paired: application.is_paired
        };
        fs.writeFileSync(path, JSON.stringify(content), {encoding:'utf8', flag:'w'});
        return true;
    } catch(err) {
        return false;
    }
}

function deleteApplication(application) {
    const path = '../storage/'+application.application_id+'.json';
    try {
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);
            return true;
        } else {
            return false;
        }
    } catch(err) {
        return false;
    }
}

module.exports = {selectApplication, insertApplication, deleteApplication}