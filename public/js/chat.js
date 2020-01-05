const socket = io();

//elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');

//templates
const messageTemplate = document.querySelector('#message-template').innerHTML ;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

//options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true});

const autoScroll = ()=>{
    //new message element
    const $newMessage = $messages.lastElementChild ;
    //height of new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    //visible height
    const visibleHeight = $messages.offsetHeight;

    //height of message container
    const containerHeight = $messages.scrollHeight

    //how far have i scrolled
    const scrollOffSet = $messages.scrollTop + visibleHeight ;

    if(containerHeight-newMessageHeight <= scrollOffSet){
        $messages.scrollTop = $messages.scrollHeight
    }

    
}

socket.on('message',(message)=>{
    console.log(message);
    const html = Mustache.render(messageTemplate,{
        username:message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm A')
    });
    $messages.insertAdjacentHTML('beforeend',html);
    autoScroll();
});

socket.on('locationMessage',(locationText)=>{
    console.log(locationText);
    const html = Mustache.render(locationTemplate,{
        username:locationText.username,
        url: locationText.url,
        createdAt: moment(locationText.createdAt).format('h:mm A')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('roomData',({room, users})=>{
    const html = Mustache.render(sidebarTemplate,{
        room,
        users
    });

    document.querySelector('#sidebar').innerHTML = html;
})

$messageForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    $messageFormButton.setAttribute('disabled','disabled');
    //disable form

    const message = e.target.elements.message.value ;
    socket.emit('sendMessage',message, (error)=>{
        //enable
        $messageFormButton.removeAttribute('disabled');
        $messageFormInput.value = '';
        $messageFormInput.focus();

        if(error)
            return console.log(error);
        
        console.log('Message delivered')
    });
});

$sendLocationButton.addEventListener('click',()=>{
    if(!navigator.geolocation)
        return alert('Geolocation not supported by your browser');
    
    $sendLocationButton.setAttribute('disabled','disabled');

    navigator.geolocation.getCurrentPosition((position)=>{
        socket.emit('sendLocation',{lat:position.coords.latitude, long:position.coords.longitude}, (error)=>{

            $sendLocationButton.removeAttribute('disabled');
            
            if(error) return console.log(error);
            
            console.log('Location shared!');
        });
});

});

socket.emit('join',{username, room}, (error)=>{
    if(error){
        alert(error);
        location.href = '/'
    }
}) 


