window.addEventListener('load',function(){
  if(typeof CATS==='undefined')return;
  CATS.flags={n:'Flags',e:'🏳️',c:'#f02848',b:'rgba(240,40,72,.15)',qs:[
    {q:'What flag?',a:'France',img:'https://flagcdn.com/w160/fr.png'},
    {q:'What flag?',a:'Germany',img:'https://flagcdn.com/w160/de.png'},
    {q:'What flag?',a:'Italy',img:'https://flagcdn.com/w160/it.png'},
    {q:'What flag?',a:'Spain',img:'https://flagcdn.com/w160/es.png'},
    {q:'What flag?',a:'Brazil',img:'https://flagcdn.com/w160/br.png'},
    {q:'What flag?',a:'Japan',img:'https://flagcdn.com/w160/jp.png'},
    {q:'What flag?',a:'Algeria',img:'https://flagcdn.com/w160/dz.png'},
    {q:'What flag?',a:'Morocco',img:'https://flagcdn.com/w160/ma.png'},
    {q:'What flag?',a:'Egypt',img:'https://flagcdn.com/w160/eg.png'},
    {q:'What flag?',a:'Saudi Arabia',img:'https://flagcdn.com/w160/sa.png'},
    {q:'What flag?',a:'Turkey',img:'https://flagcdn.com/w160/tr.png'},
    {q:'What flag?',a:'Portugal',img:'https://flagcdn.com/w160/pt.png'},
    {q:'What flag?',a:'Argentina',img:'https://flagcdn.com/w160/ar.png'},
    {q:'What flag?',a:'Australia',img:'https://flagcdn.com/w160/au.png'},
    {q:'What flag?',a:'Qatar',img:'https://flagcdn.com/w160/qa.png'},
    {q:'What flag?',a:'UAE',img:'https://flagcdn.com/w160/ae.png'},
    {q:'What flag?',a:'Tunisia',img:'https://flagcdn.com/w160/tn.png'},
    {q:'What flag?',a:'Libya',img:'https://flagcdn.com/w160/ly.png'},
    {q:'What flag?',a:'Palestine',img:'https://flagcdn.com/w160/ps.png'},
    {q:'What flag?',a:'Iraq',img:'https://flagcdn.com/w160/iq.png'}
  ]};
  if(typeof CKS!=='undefined')CKS.push('flags');
  if(typeof buildCats==='function')buildCats();
});
