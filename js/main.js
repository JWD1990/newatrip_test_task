/*
    Заюзаем hoisting
    А также нам нужно только количество элементов в контейнере, т.е.
    ждём ток DOM-дерево и усё
*/
document.addEventListener("DOMContentLoaded", run);

const sourceTimeBlockSelector = '.card__available-times-block';
const targetTimeBlockSelector = '.card__more-available-times-block';
const timeItemClassName = 'card__available-time-item';
const hiddenClassName = 'hidded-entity';
const textForToggleShowBtn = 'ещё...';

function run() {
	let blocks = document.querySelectorAll(sourceTimeBlockSelector);

	if (!blocks.length) {
		console.log('Не найдены блоки с временем отрпавлений!');
		return;
	}

	const time_blocks_for_handled = getDataOfTimeBlocksForHandled(blocks);

	if (!Object.keys(time_blocks_for_handled).length) {
		console.log('Блоков, которые имеют количество вариантов времени отправления >4, нет.');
		return;
	}

	// проверим на всякий, что есть куда перекидывать
	targetBlocks = document.querySelectorAll(targetTimeBlockSelector);
	
	if (!targetBlocks.length) {
		console.log('Не найдены блоки для размещения скрытых вариантов времени отправки!');
		return;
	}

	startProccess(time_blocks_for_handled, targetBlocks);
}

function getDataOfTimeBlocksForHandled(blocks) {
	// тут будет в каком именно по порядку блоке, лежат ноды
	// на перемещение, а также линки на ноды для перемещения
	// и линк на 4ую ноду для преобразования в кнопку показа
	// блока с доп временем отправлений, которые скрыты
	const time_blocks_for_handled = {};

	// считаем сколько в блоках итемов (сложность в том, что переносы в 
	// HTML как textNode считается... придётся фильтрить)
	// если 4, то делаем переброску и кнопульку показа строки с переброшенными
	for (let [number_block, next_block] of blocks.entries()) {
		const childs = next_block.childNodes;

		if (!childs.length) {
			console.log('В данном блоке нету дочерних элементов', next_block);
			continue;
		}

		const {
			show_btn_more_times_link,
			times_item_links_from_time_blocks_for_movement
		 } = getDataOfNodesForMove(childs, timeItemClassName);

		if (!times_item_links_from_time_blocks_for_movement.length) {
			console.log('В данном блоке нету дочерних элементов для перемещения', next_block);
			continue;
		}

		console.log('Найден блок со скрытыми элементами времени отправления', next_block);

		time_blocks_for_handled[number_block] = {
			movement_nodes: times_item_links_from_time_blocks_for_movement,
			show_btn_more_times_link
		};
	}

	return time_blocks_for_handled;
}
/*
	return {
		number_item_block: {
			movement_nodes - [],
			show_btn_more_times_link - DOMNodeLink
		},
		...
	}
*/

function getDataOfNodesForMove(childs, target_class) {
	// количество нод с временем отправления
	let count_time_items = 0;
	const data = {
		// возьмём ссылочку на 4ый элемент, для ситуации, если у нас их будет >4
		show_btn_more_times_link: null,
		// а также склоним ссылки на элементы с 4ого и далее (чтобы не потерять это время,
		// т.к. оно теперь будет просто кнопкой показа остальных вариантов времени отправки),
		// чтобы их перекинуть на следующую строку
		times_item_links_from_time_blocks_for_movement: [],
	};

	// собственно считаем количество нод времени отправления
	for (const time_node of childs) {
		cl = time_node.classList;

		if (!(cl && cl.contains(target_class))) { // будет гуд, т.к. по принципу ленивого вычисления условие
			continue;
		}

		count_time_items++;

		// сохраняем линки на ноды времени отправления
		if (count_time_items >= 4) {
			if (count_time_items === 4) data.show_btn_more_times_link = time_node;

			data.times_item_links_from_time_blocks_for_movement.push(time_node);
		}
	}

	return data;
}

function initToggleShowBtn(timeItemsBlock, toggleBtn) {
	toggleBtn.addEventListener('click', function toggleShowTimeItemsBlock() {
		cl = timeItemsBlock.classList;
		cl.toggle(hiddenClassName);
	});
	toggleBtn.innerHTML = textForToggleShowBtn;
}

function moveTimeItems(timeItems, targetTimeItemsBlock) {
	for (let [idx, timeItem] of timeItems.entries()) {
		let copyNode = timeItem.cloneNode(true);

		targetTimeItemsBlock.appendChild(copyNode);

		// первый (0) не тронеться
		if (idx) {
			timeItem.parentNode.removeChild(timeItem);
		}
	}
}

function startProccess(sourceData, targetData) {
	for (let [idx, targetBlock] of targetData.entries()) {
		const data = sourceData[idx];

		if (!data) {
			continue;
		}

		moveTimeItems(data.movement_nodes, targetBlock);
		initToggleShowBtn(targetBlock, data.show_btn_more_times_link);
	}
}
