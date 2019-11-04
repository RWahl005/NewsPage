let data = document.getElementsByTagName("h3");
for(let i in data){
    let date = data[i].innerText;
    data[i].innerHTML = new Date(date).toLocaleString();
}