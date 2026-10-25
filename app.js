const menuButton=document.querySelector('.menu-toggle');const nav=document.querySelector('.nav');
menuButton?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));menuButton.textContent=open?'✕':'☰'});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuButton?.setAttribute('aria-expanded','false');if(menuButton)menuButton.textContent='☰'}));
const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();
const form=document.querySelector('#application-form');
if(form){
 const statusBox=form.querySelector('.form-status');const submit=form.querySelector('.submit-button');
 function setError(input,message){const label=input.closest('label');const error=label?.querySelector('.field-error');if(error)error.textContent=message;input.setAttribute('aria-invalid',message?'true':'false')}
 form.querySelectorAll('input:not([type=checkbox]),select,textarea').forEach(input=>input.addEventListener('input',()=>setError(input,'')));
 form.addEventListener('submit',event=>{
  event.preventDefault();statusBox.className='form-status';statusBox.textContent='';let valid=true;
  const name=form.elements.name,phone=form.elements.phone,email=form.elements.email,type=form.elements.clientType,task=form.elements.task,consent=form.elements.consent;
  [[name,name.value.trim().length>=2,'Введите имя (не менее 2 символов).'],[phone,/^[+()\d\s-]{7,25}$/.test(phone.value.trim()),'Введите корректный номер телефона.'],[email,/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()),'Введите корректный адрес электронной почты.'],[type,!!type.value,'Выберите тип клиента.'],[task,task.value.trim().length>=10,'Опишите задачу подробнее (не менее 10 символов).']].forEach(([input,ok,message])=>{setError(input,ok?'':message);if(!ok)valid=false});
  const consentError=form.querySelector('.consent-error');consentError.textContent=consent.checked?'':'Необходимо согласие на обработку персональных данных.';if(!consent.checked)valid=false;
  if(!valid){statusBox.className='form-status error';statusBox.textContent='Пожалуйста, проверьте поля формы.';form.querySelector('[aria-invalid="true"]')?.focus();return}
  const clientType=type.value==='business'?'Бизнес':'Частное лицо';
  const body=['Новая заявка с сайта «Три желания»','',`Имя: ${name.value.trim()}`,`Телефон: ${phone.value.trim()}`,`Email клиента: ${email.value.trim()}`,`Тип клиента: ${clientType}`,'',`Описание задачи:\n${task.value.trim()}`,'','Согласие на обработку персональных данных: дано','Источник: GitHub Pages (статическая версия)'].join('\n');
  const mailto=`mailto:mailbox@familypost.ru?subject=${encodeURIComponent('Заявка с сайта «Три желания»')}&body=${encodeURIComponent(body)}`;
  statusBox.className='form-status success';statusBox.textContent='Откроется ваше почтовое приложение с подготовленной заявкой. Чтобы отправить её, нажмите «Отправить» в почтовом приложении.';
  window.location.href=mailto;
 });
}
