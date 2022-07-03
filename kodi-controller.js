const kodi = require('kodi-ws');

class kodiController {
    async getConnection() {
        return await kodi('127.0.0.1', 9090); //host e porta do kodi
    }

    async authorization(app_name, appid) {
        await this.getConnection()
            .then(async con =>
                await con.Addons.ExecuteAddon({
                    addonid: "script.popup",
                    params: {
                        "action": "authorization",
                        "app_name": app_name,
                        "appid": appid
                    },
                    wait: true
                })
            );
    }

    async pin(app_name, appid) {
        await this.getConnection()
            .then(async con =>
                await con.Addons.ExecuteAddon({
                    addonid: "script.popup",
                    params: {
                        "action": "pin",
                        "app_name": app_name,
                        "appid": ""+appid+""
                    },
                    wait: true
                })
            );
    }

    async closeAlertWindow() {
        let speed = await this.getConnection()
            .then(async con =>
                await con.run('Input.Back')
            );
        return speed.speed === 0;
    }

    async setPlayPause() {
        await this.getConnection()
            .then(async con =>
                await con.run('Player.PlayPause', { playerid: 1 })
            );
    }

    async setStop() {
        await this.getConnection()
            .then(async con =>
                await con.run('Player.Stop', { playerid: 1 })
            );
    }

    async getVolume() {
        return await this.getConnection()
            .then(async con =>
                await con.run('Application.GetProperties', { properties : ['volume'] })
            );
    }

    async setVolume(volume) {
        await this.getConnection()
            .then(async con =>
                await con.run('Application.SetVolume', { volume: volume })
            );
    }

    async isPaused() {
        let speed = await this.getConnection()
            .then(async con =>
                await con.run('Player.GetProperties', { playerid: 1, properties : ['speed'] })
            );
        return speed.speed === 0;
    }
}
module.exports = kodiController;