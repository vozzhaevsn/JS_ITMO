// Решение системы линейных уравнений методом Крамера
// Коэффициенты
const n1 = 8;
const n2 = 7;
const n3 = 5;
const n4 = 3;
const n5 = 2;
const n6 = 0;

const D = n1 * n5 - n2 * n4; //Основной определитель

const Dx = n3 * n5 - n2 * n6; //Определитель для x

const Dy = n1 * n6 - n3 * n4; // Определитель для y

const x = Dx / D;
const y = Dy / D;

D === 0 ? console.log('Система не имеет единственного решения') : console.log('x = ', x, 'y = ', y);
