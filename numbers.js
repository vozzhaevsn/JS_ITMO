(async () => {
    const numbersUrl = 'https://kodaktor.ru/j/numbers';
    const formUrl = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSeZyDJ_68Mj7io5vtjyNqul7ceNE1t5Z5KkkN7foqxbIcUsbg/formResponse';
  
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    try {
        const numbersResponse = await fetch(numbersUrl);
        if (!numbersResponse.ok) {
            throw new Error('Ошибка при получении чисел: ' + numbersResponse.status);
        }
        
        const { numbers } = await numbersResponse.json();

        const sum = numbers.map(({ value: v }) => v).reduce((x, y) => x + y, 0);

        
        const surnames = ['VozzhaevSemen']; 
        
        const result = `${sum} (${surnames.join(', ')})`;

        const body = 'entry.364005965=' + encodeURIComponent(result); 
        const response = await fetch(formUrl, {
          method: 'POST',
          headers,
          body,
        });
    
        if (!response.ok) {
            throw new Error('Ошибка при отправке данных: ' + response.status);
        }

        const text = await response.text();
        console.log('Ответ сервера:', text);
    } catch (error) {
        console.error('Ошибка запроса:', error);
    }
})();