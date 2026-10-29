(function(){
  var el=document.getElementById("postList"); if(!el) return;
  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}
  fetch("blog/posts.json?v="+Date.now()).then(function(r){return r.json();}).then(function(p){
    p.sort(function(a,b){return a.date<b.date?1:-1;});
    el.innerHTML=p.slice(0,3).map(function(x){
      var d=new Date(x.date+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
      return '<a class="post-card" href="blog/post.html?p='+encodeURIComponent(x.slug)+'"><img loading="lazy" alt="'+esc(x.title)+'" src="'+esc(x.image)+'"><div class="body"><span class="meta">'+d+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.excerpt)+'</p><span class="more">Read article &rarr;</span></div></a>';
    }).join("");
  }).catch(function(){el.innerHTML="";});
})();
