(async () => {
    const response = await fetch('https://www.worldtimeserver.com/current_time_in_RU-SPE.aspx?city=Saint_Petersburg');
    const text = await response.text();
    const regex = /\d{2}:\d{2}:\d{2}/;
    const timeMatch = text.match(regex);
    
    console.log(timeMatch ? timeMatch[0] : '');
})();