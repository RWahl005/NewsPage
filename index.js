const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const rsql = require('./rsql/rsql.js');
const app = express();
const fs = require('fs');
const { PerformanceObserver, performance } = require('perf_hooks');
app.listen(8080, () => console.log('Server running...'));

/*=======================================
 * Configuration Section
 * =======================================
 */
// The number of articles to be displayed.
const articlesDisplayed = 3;
/*=======================================
 * End Of Configuration Section
 * =======================================
 */

/**
 * This is the class to store the articles.
 */
class Article{
    constructor(title, id, imageSrc, imageAlt, date, content){
        this.title = title;
        this.id = id;
        this.imageSrc = imageSrc;
        this.imageAlt = imageAlt;
        this.date = date;
        this.content = content;
    }
    compile(){
        return this;
    }
}

/*
    Loads the data when the server starts.
*/
let newsData = [];
const rinst = new rsql.RSQL(new rsql.JSONProperties('articles.json'));
if(fs.existsSync('articles.json')){
    let data = rinst.get(Article);
    if(data != null){
        newsData = data;
    }
}


/*
 * Load in handlebars. 
 */
const hbs = require('express-handlebars')({
    defaultLayout: 'main',
    extname: '.hbs',
    helpers: {
      static(path) {
        return path;
      },
      escapeJSString(str) {
        if (! str) {
          return null;
        }
        return jsesc(str, {
          escapeEverything: true, 
          wrap: true 
        });
      }
    }
});

app.engine('hbs', hbs);
app.set('view engine', 'hbs');

app.use(express.static(__dirname + '/public'));

app.use(session({
	secret: 'erjgohe347&4oignverog&43%oweh',
	resave: true,
	saveUninitialized: true
}));

app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

/**
 * Confirming Authorization.
 */
app.post('/auth', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    if(!(username && password)) res.redirect("/news");
    if(username === "admin" && password === "123"){
        req.session.login = true;
        res.redirect('/news-make');
    }else{
        res.redirect('/news');
    }
    res.end();
});

/**
 * Handle the pages.
 */
app.get('/news/page/*/', (req, res) => {
    let pages = req.path.split('/');
    let num = parseInt(pages[pages.length-1])
    if(num == 0) { 
        res.redirect('/news')
        return;
    }
    if(newsData.length > (num * articlesDisplayed)){
        let articles = [];
        for(let i = num * articlesDisplayed; (i < ((num*articlesDisplayed) + articlesDisplayed)) && (i < newsData.length); i++){
            articles.push(newsData[i].compile());
        }
        let page = (num*articlesDisplayed)+articlesDisplayed  <  newsData.length ? num : 'last';
        res.render("news.hbs", {data: articles, page: page, prevPage: num-1, nextPage: num+1, pageNum: num+1});
    }
    else{
        res.redirect("/news");
    }
});

/**
 * Handles the title stuff.
 */
app.get('/news/*', (req, res) => {
    if(req.path.includes('%20')) {res.redirect(req.path.replace('%20', '_').toLowerCase());
    return;}
    if(!(req.path.split('/').length < 4 || (req.path.split('/').length < 5 && req.path.split('/')[3] == ''))){
        res.redirect('/news');
        return;
    }
    let name;
    if(req.path.split('/').length < 4) name = req.path.split('/')[2];
    else if(req.path.split('/').length < 5) name = req.path.split('/')[1];
    for(let i in newsData){
        if(newsData[i].id == name){
            res.render("newsSearch.hbs", {data: [newsData[i]]});
            return;
        }
    }
    res.redirect('/news');
})

/**
 * Handles the main news page.
 */
app.get('/news', (req, res) => {
    if(req.path.split('/')[req.path.split('/').length] === '') res.redirect('/news');
    let articles = [];
    for(let i = 0; (i < articlesDisplayed) && (i < newsData.length); i++){
        articles.push(newsData[i].compile());
    }
    let page = (0*articlesDisplayed)+articlesDisplayed  <  newsData.length ? 0 : '0-last';
    res.render("news.hbs", {data: articles, page: page, prevPage: 0, nextPage: 1, pageNum: 1});
});

/**
 * Makes a news article.
 */
app.get('/news-make', (req, res) => {
    if(!req.session.login){
        res.sendFile(__dirname + '/login.html');
        return;
    }
    else{
        res.sendFile(__dirname + "/make-news.html");
        return;
    }
});

/**
 * Deletes a news article.
 */
app.get('/news-delete', (req, res) => {
    if(!req.session.login){
        res.sendFile(__dirname + '/login.html');
        return;
    }
    else{
        res.render('delete-news.hbs', {data: newsData});
    }
});

/**
 * The request to delete a news article.
 */
app.post('/deletenews', (req, res) => {
    if(!req.session.login){
        res.redirect('/news');
        return;
    }
    else{
        let pass = req.body.password;
        let artID = req.body.article;
        if(pass !== 'e7u4'){
            req.session.login = false;
            res.redirect('/news');
            return;
        }
        let foundId = 0;
        for(let i in newsData){
            if(newsData[i].id === artID){
                foundId = i;
                break;
            }
        }
        newsData.splice(foundId, 1);
        rinst.proccess(newsData);
        newsData = rinst.get(Article);
        req.session.login = false;
        res.redirect('/news');
    }
});

/**
 * The request to make a new article.
 */
app.post('/postnews', (req, res) => {
    if(!req.session.login){
        res.redirect('/news-make');
        res.end();
        return;
    }
    else{
        let title = req.body.title;
        let imageSrc = req.body.imageSrc;
        let imageAlt = req.body.imageAlt;
        let content = req.body.content;
        if(content.includes("<script") || content.includes("<link")){
            req.session.login = false;
            res.redirect('/news');
            res.end();
            return;
        }
        newsData.unshift(new Article(title, generateUUID(), imageSrc, imageAlt, new Date(), content));
        rinst.proccess(newsData);
        newsData = rinst.get(Article);
        req.session.login = false;
        res.redirect('/news');
        res.end();
        return;
    }
});

/**
 * If the page is not found then go here.
 */
app.get('*', function(req, res){
    res.status(404).redirect("/news");
});


/**
 * Generates a new UUID
 */
  function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}