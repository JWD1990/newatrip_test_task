/*
	Тех данные.

	Почему использовал инвертацию знака для GMT
	https://momentjs.com/timezone/docs/#/zone-object/offset/

	Как утверждается в статье - GMT и UTC по большинству взаимозаменяемые
	https://medium.com/@EyeDin/time-and-time-zone-headaches-in-javascript-ae4d873a665d

	Конекты к селектам не будем делать, можно через id заюзаться.
	По нормальному, конечно, надо бы сделать ибо было место куда смотреть, как минимум, по багам.

  Здесь нужно бы использовать ReactJS/Redux...
	Или хотя бы Redux / самописный стейт-менеджер
	Не правильно оценил задание...
*/

function* iterItemsInObjKeys(data = {}) {
	for (let key in data) {
		elements = data[key];

		for (let e of elements) {
			yield [key, e];
		}
	}
}

function getRoutesObjWithMomentsTimeItems(data, sourseTZ, targetTZ) {
	const newData = {};

	for (let timeItemData of iterItemsInObjKeys(data)) {
		const [routName, timeItemStr] = timeItemData;
		const srcGmtStr = `Etc/GMT${sourseTZ}`;
		const targetGmtStr = `Etc/GMT${targetTZ}`;
		const sourceTimeMoment = moment.tz(timeItemStr, srcGmtStr);
		const convetedTimeMoment = sourceTimeMoment.clone().tz(targetGmtStr);

		newData[routName] = newData[routName] || [];
		newData[routName].push(convetedTimeMoment);
	}

	return newData;
}

function makeHTMLStringsOptions(items, typeRout, translateRoute) {
	const htmlStrings = [];

	for (let item of items) {
		// По факту время указывать мы будем только как контент позиции,
		// т.к. index + тип пути это всё что нужно для взятия соотвествующего momentObj из данных.
		// Индекс нам прилетит при событии выбора позиции
		htmlStrings.push(`<option value="${`${typeRout}`}">${item.format("HH:mm")}(${translateRoute})</option>`);
	}

	return htmlStrings;
}

// можно и один в массивчике кинуть
function insertOptionsToSelect(target, elements) {
	for (let e of elements) {
		const template = document.createElement('template');
		template.innerHTML = e;
		target.add(template.content.firstChild);
	}
}

function changeOptionHandler(event) {
	const select = event.currentTarget || event.target;

	const dictOfHandlers = {
		'route': handleChangeRoutOption,
		'time_select': handleChangeTimeOption,
		'back_time_select': handleChangeBackTimeOption
	};

	const handler = dictOfHandlers[select.id];

	if (!handler) {
		console.log('Нет обработчика для select\'а c id: ', select.id);
		return false;
	}

	const indexSelectedOption = select.selectedIndex;

	handler(select, indexSelectedOption);
}

function handleChangeRoutOption(select, routType) {
	// нужно убирать старую информацию при изменени прараметров
	result_place.innerHTML = '';

	const lastRoutType = store['routType'];

	updateStore({'routType': routType });

	if (lastRoutType === routType) {
		return false;
	}

	// в любом случае второй селект для выбора обратного времени надо скрыть,
	// т.к. может быть перерендер позиций в нём из-за нового времени первого отправления
	// ---
	// пере-/заполение в handleChangeTimeOption по надобности
	// (зависит от данных из первого селекта выбора времени отправки)
	if (routType !== 2) {
		back_time_block.style = 'display: none;';
	}
	
	if (routType !== 1) {
		// 0/2 для первого селекта выбора времени отправки это всё "из А в В"
		routType = 0;
		updateStore({ departurTimeToAPoint: null });
	}
	else {
		updateStore({ departurTimeToBPoint: null });
	}

	if (
		((lastRoutType === 0 || lastRoutType === 2) && routType === 1)
		|| (lastRoutType === 1 && routType !== 1)
		|| lastRoutType === null
	) {
		time_block.style = 'display: none;';

		// убираем все опции
		if (lastRoutType !== null) {
			time_select.options.length = 0;
		}

		insertOptionsToSelect(time_select, HTMLStringsOptions[routType]);
		// выставим для удобства сразу первое время в списке
		handleChangeTimeOption(time_select);
		time_block.style = '';
	}
}

function handleChangeTimeOption(select, indexSelectedOption=0) {
	const currentRouteType = store['routType'];
	const departurTimeToSomePoint = departurTimetable[select.value][indexSelectedOption];

	updateStore({
		[(currentRouteType === 1) ? 'departurTimeToAPoint' : 'departurTimeToBPoint']: departurTimeToSomePoint
	});

	if (currentRouteType == 2) {
		back_time_select.options.length = 0;

		const arrivalTimeToBpoint = departurTimeToSomePoint.clone().add(store['routTime'], 'm');

		// console.log('arrivalTimeToBpoint: ', arrivalTimeToBpoint.format());

		const typeRoutKey = 'bToA';
		const departurTimetableToApoint = departurTimetable[typeRoutKey];
		const departurTimeTableToApointAfterArrival = [];
		let offsetForPositionDeparturTimeItemToAposition = null;
		
		for (let [index, timeItem] of departurTimetableToApoint.entries()) {
			if (timeItem >= arrivalTimeToBpoint) {
				if (offsetForPositionDeparturTimeItemToAposition === null) {
					offsetForPositionDeparturTimeItemToAposition = index; // console.log('offset', offsetForPositionDeparturTimeItemToAposition);
					updateStore({ offsetForPositionDeparturTimeItemToAposition });
				}

				departurTimeTableToApointAfterArrival.push(timeItem);
			}
		}

		// console.log(departurTimeTableToApointAfterArrival);

		const HTMLStringsOptions = makeHTMLStringsOptions(
			departurTimeTableToApointAfterArrival,
			typeRoutKey,
			dictOfTypeRouts[typeRoutKey]
		);

		// console.log(HTMLStringsOptions);

		insertOptionsToSelect(back_time_select, HTMLStringsOptions);
		// выставим для удобства сразу первое время в списке
		handleChangeBackTimeOption(back_time_select);
		back_time_block.style = '';
	}

	// т.к. предвыбор всегда делается, то и сразу отобразим
	tickets_and_calculate.style = '';
}

function handleChangeBackTimeOption(select, indexSelectedOption=0) {
	const offset = store['offsetForPositionDeparturTimeItemToAposition']; // console.log('offset', offset);
	const indexSelectedOptionWithOffset = indexSelectedOption + offset; //console.log('Index with offset', indexSelectedOptionWithOffset);
	const departurTimeToAPoint = departurTimetable[select.value][indexSelectedOptionWithOffset]; //console.log(departurTimeToAPoint.format());
	updateStore({ departurTimeToAPoint });
}

function getUpdateStoreFunc(store) {
	return function updateStore(data) {
		if (data.hasOwnProperty('routType')) {
			store['routType'] = data['routType'];
		}
		if (data.hasOwnProperty('departurTimeToBPoint')) {
			store['departurTimeToBPoint'] = data['departurTimeToBPoint'];
		}
		if (data.hasOwnProperty('departurTimeToAPoint')) {
			store['departurTimeToAPoint'] = data['departurTimeToAPoint'];
		}
		if (data.hasOwnProperty('offsetForPositionDeparturTimeItemToAposition')) {
			store['offsetForPositionDeparturTimeItemToAposition'] = data['offsetForPositionDeparturTimeItemToAposition'];
		}
	};
}


const store = {
	priceTo: 700,
	priceToAndBack: 1200,
	routTime: 40,
	routType: null,
	departurTimeToBPoint: null,
	departurTimeToAPoint: null, // также будет как время обратно в A после A => B
	offsetForPositionDeparturTimeItemToAposition: 0,
};
const updateStore = getUpdateStoreFunc(store);
const dictOfTypeRouts = {
	'aToB': 'из A в B',
	'bToA': 'из B в A',
	'aToBtoA': 'из A в B и обратно в А'
};
let departurTimetable = {
	aToB: [
		'2021-08-21 18:00:00',
		'2021-08-21 18:30:00',
		'2021-08-21 18:45:00',
		'2021-08-21 19:00:00',
		'2021-08-21 19:15:00',
		'2021-08-21 21:00:00'
	],
	bToA: [
		'2021-08-21 18:30:00',
		'2021-08-21 18:45:00',
		'2021-08-21 19:00:00',
		'2021-08-21 19:15:00',
		'2021-08-21 19:35:00',
		'2021-08-21 21:50:00',
		'2021-08-21 21:55:00'
	],
};
const departurTimetableTZ = 3; // МСК
const userTZ = (new Date()).getTimezoneOffset() / 60; // уже будет корректно по Posix

// преобразовывать данные в moment надо в любом случае
// например, чтобы формат нужный выставить для options или отсеить время для
// случая когда плывём из А в B, потом обратно в A
departurTimetable = getRoutesObjWithMomentsTimeItems(
	departurTimetable,
	departurTimetableTZ > 0 ? ('' + -departurTimetableTZ) : ('+' + departurTimetableTZ),
	userTZ
)

// готовим данные для заполнения в первый селект

// для первого селекта с временем нужны все позиции,
// которые могу быть как для 'aToB', так и для 'bToA'
// ---
// для второго только обратные, но их придётся пересоздавать,
// т.к. список надо филтрить постоянно
const HTMLStringsOptions = [];
let typeRoutKey = 'aToB';
HTMLStringsOptions.push(
	makeHTMLStringsOptions(
		departurTimetable[typeRoutKey],
		typeRoutKey,
		dictOfTypeRouts[typeRoutKey]
	)
);
typeRoutKey = 'bToA';
HTMLStringsOptions.push(
	makeHTMLStringsOptions(
		departurTimetable[typeRoutKey],
		typeRoutKey,
		dictOfTypeRouts[typeRoutKey]
	)
);

// в event будет select, из которого и возьмём все данные по изменениям
for (let select of [route, time_select, back_time_select]) {
	select.addEventListener("change", changeOptionHandler);
}

num.oninput = num.onpaste = function() {
	result_place.innerHTML = '';
}

// кнопка расчёта
make_info.addEventListener('click', () => {
	let countTickets = num.value.trim();

	if (!countTickets.match(/^\d+$/)) {
		result_place.innerHTML = 'Должно быть указано целое количестов билетов';
		return false;
	}

	countTickets = +countTickets;

	const priceTiket = store['routType'] === 0 || store['routType'] === 1 ? store['priceTo'] : store['priceToAndBack'];
	const total = countTickets * priceTiket;
	const totalRoutTime = store['routType'] === 2 ? store['routTime'] * 2 : store['routTime'];

	let keyRoutForFirstRout = 'aToB';

	if (store['routType'] === 1) {
		keyRoutForFirstRout = 'bToA';
	}

	const timeFormat = 'HH:mm';
	const departurTime_1 = store['departurTimeToBPoint'];
	const rout_1 = !departurTime_1 ? '' :
								 `Ваш путь ${dictOfTypeRouts[keyRoutForFirstRout]}:<br>отправление: ${departurTime_1.format(timeFormat)}, `
								 + `<br>прибытие: ${departurTime_1.clone().add(store['routTime'], 'm').format(timeFormat)}`;
	const departurTime_2 = store['departurTimeToAPoint'];
	const rout_2 = !departurTime_2 ? '' :
								 `Ваш путь ${dictOfTypeRouts['bToA']}:<br>отправление: ${departurTime_2.format(timeFormat)}, `
								 + `<br>прибытие: ${departurTime_2.clone().add(store['routTime'], 'm').format(timeFormat)}`;

	result_place.innerHTML = `
		Количество билетов: ${countTickets}<br>
		Общая стоимость поездки: ${total}<br>
		Путешествие займёт у вас: ${totalRoutTime} минут <br>
		${`${rout_1}${rout_1 && '<br><br>'}`}
		${rout_2}
	`;
});