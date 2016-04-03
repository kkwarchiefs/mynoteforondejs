var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var mongoose = require('mongoose');
var models = require('./models/models');
var session = require('express-session');
var moment = require('moment')

var User = models.User;
var Note = models.Note;
var flag = 'true'

mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error', console.error.bind(console, '连接数据库失败'));
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

app.use(session({
	secret: '1234',
	name: 'mynote',
	cookie: {maxAge: 1000 * 60 * 60 * 24 * 7},
	resave: false,
	saveUninitialized: true
}));

app.get('/', function(req, res) {
	try {
	Note.find({author: req.session.user.username})
		.exec(function(err, allNotes) {
			if(err) {
				console.log(err)
				return res.redirect('/')
			}
			res.render('index', {
				title: '首页',
				user: req.session.user,
				notes: allNotes
			})
		})
	} catch (err) {
		res.redirect('/login')
	}
});

app.get('/register', function(req, res) {
	if (req.session.user)
		return res.redirect('/')
	console.log('注册');
	res.render('register', {
		user: req.session.user,
		title : '注册',
		flag : flag
	});
	flag = 'true'
});

app.post('/register', function(req, res) {
	if (req.session.user)
		return res.redirect('/')
	var username = req.body.username, 
	password = req.body.password,
	passwordRepeat = req.body.passwordRepeat;
	
	if (username.trim().length == 0) {
		console.log('用户名不能为空！');
		return res.redirect('/register');
	}
	if (password.trim().length == 0 || passwordRepeat.trim().length == 0) {
		console.log('密码不能为空！');
		return res.redirect('/register');
	}
	if (password != passwordRepeat) {
		console.log('两次输入的密码不一致！');
		return res.redirect('/register');
	}
	
	User.findOne({username: username}, function(err, user) {
		if (err) {
			console.log(err);
			return res.redirect('/register');
		}
		if (user) {
			console.log('用户名已经存在');
			flag = 'false'
			return res.redirect('/register');
		}
		var md5 = crypto.createHash('md5'),
		md5password = md5.update(password).digest('hex');
		
		var newUser = new User({
			username: username,
			password: md5password
		});
		
		newUser.save(function(err, doc) {
			if (err) {
				console.log(err);
				return res.redirect('/register');
			}
			console.log('注册成功');
			return res.redirect('/');
		});
	});
});

app.get('/login', function(req, res) {
	if (req.session.user)
		return res.redirect('/')
	console.log('登录');
	res.render('login', {
		user: req.session.user,
		title : '登录'
	});
});

app.post('/login', function(req, res) {
	if (req.session.user)
		return res.redirect('/')
	var username = req.body.username,
	password = req.body.password;
	
	User.findOne({username: username}, function(err, user) {
		if(err) {
			console.log(err);
			return res.redirect('/login');;
		}
		if(!user) {
			console.log('用户不存在');
			return res.redirect('/login');;
		}
		var md5 = crypto.createHash('md5'),
		md5password = md5.update(password).digest('hex');
		if(user.password !== md5password) {
			console.log('密码错误！');
			return res.redirect('/login');
		}
		console.log('登录成功！');
		user.password = null;
		delete user.password;
		req.session.user = user;
		return res.redirect('/');
	});
});

app.get('/quit', function(req, res) {
	req.session.user = null;
	console.log('退出');
	res.redirect('/login');
});

app.get('/post', function(req, res) {
	console.log('发布');
	res.render('post', {
		user: req.session.user,
		title : '发布'
	});
});

app.post('/post', function(req, res) {
	var note = new Note({
		title: req.body.title,
		author: req.session.user.username,
		tag: req.body.tag,
		content: req.body.content
	});
	note.save(function(err, doc) {
		if(err) {
			console.log(err)
			return res.redirect('/post')
			
		}
		console.log('文章发表成功！')
		return res.redirect('/')
	})
	
});

app.get('/detail/:_id', function(req, res) {
	console.log('查看笔记');
	Note.findOne({_id: req.params._id})
		.exec(function(err, art) {
			if(err) {
				console.log(err)
				return res.redirect('/')
			}
			if(art) {
				res.render('detail', {
					title: '笔记详情',
					user: req.session.user,
					art: art,
					moment: moment
				})
			}
		})
});

app.listen(3030, function(req, res){
	console.log('app is running at port 3030');
});
