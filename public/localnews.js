let data = document.getElementsByTagName("h3");
for(let i in data){
    let date = data[i].innerText;
    data[i].innerHTML = new Date(date).toLocaleString();
}

let nxt = document.getElementById("next");
let prv = document.getElementById('prev');
if(prv.className == '0' || prv.className == '-1' || prv.className == '0-last') prv.style.display = "none";
if(nxt.className == 'last' || nxt.className == '-1' || prv.className == '0-last') nxt.style.display = "none";