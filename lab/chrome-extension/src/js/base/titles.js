export default async function (keyword) {
  let res=await fetch("https://www.baidu.com/s?tn=news&word="+encodeURI(keyword));
  let result=await res.text();
  // let div=document.createElement("div");
  document.querySelector("#baidu").innerHTML=result;
  let ts=Array.from(document.querySelectorAll("#container h3"),p=>{return p.innerText})
  //console.log(ts)
  return ts;
};
