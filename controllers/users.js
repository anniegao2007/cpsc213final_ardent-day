const userModels = require('../models/users.js');
const Users = userModels.Users;

async function login(req, res){
    await userModels.login(req, res, Users);
    res.redirect('/');
}

async function logout(req, res){
    await userModels.logout(req, res);
    res.redirect('/');
}

async function register(req, res){
    await userModels.register(req, res, Users);
    res.redirect('/');
}

module.exports = {
    login,
    logout,
    register,
};