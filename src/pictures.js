'use strict';

(function() {
  /**
   * @const
   * @type {Number}
   */
  var IMAGE_LOAD_TIMEOUT = 5000;

  /**
   * @const
   * @type {string}
   */
  var DATA_LOAD_URL = '/json/pictures.json';

  /**
  * Размеры плитки
  * @const
  * @type {Number}
  */
  var TILE_WIDTH = 196;
  var TILE_HEIGHT = 196;

  /**
   * Константа для перерисовки экрана
   * @const
   * @type {Boolean}
   */
  var REDRAW_PAGE = true;

  /**
   * Типы сортировки
   * @enum {number}
   */
  var SortType = {
    POPULAR: 'popular',
    NEW: 'new',
    DISCUSSED: 'discussed'
  };

  /**
   * Тип сортировки по-умолчанию
   * @const
   * @type {SortType}
   */
  var DEFAULT_SORT_TYPE = SortType.POPULAR;

  /**
  * Тип сортировки
  * @type {Object}
  */
  var sortType = {
    type: DEFAULT_SORT_TYPE,
    ascending: false
  };

  /**
   * Исходный массив данных о плитках
   * @type {Array.<Object>}
   */
  var tilesArray = [];

  /**
   * Массив данных о плитках для отрисовки
   * @type {Array.<Object>}
   */
  var filteredTilesArray = [];

  /**
   * Счетчик отрисованных страниц
   * @type {Number}
   */
  var pagesCount;

  /**
   * Счетчик отрисованных плиток
   * @type {Number}
   */
  var tilesCount;

  /** @type {number} идентификатор таймаута обработчика скролла */
  var scrollTimeout;

  /**
   * Шаблон плитки
   * @type {HTMLElement}
   */
  var tileTemplate;

  /**
   * Контейнер шаблонов
   * @type {HTMLElement}
   */
  var templateElement = document.querySelector('#picture-template');

  /**
   * Контейнер для плиток
   * @type {HTMLElement}
   */
  var tilesContainer = document.querySelector('.pictures');

  /**
   * Фильтры
   * @type {HTMLFormElement}
   */
  var tileFilterForm = document.querySelector('.filters');

  /**
   * Возвращает подготовленный элемент плитки
   * @param {Object} tile
   * @returns {HTMLElement}
   */
  var getTileElement = function(tile) {
    /**
     * Клонированный элемент
     * @type {HTMLElement}
     */
    var tileElement = tileTemplate.cloneNode(true);

    /**
     * Загрузка изображения.
     */
    (function() {
      /**
       * Объект изображения для загрузки
       * @type {Image}
       */
      var tileImage = new Image(182, 182);

      /**
       * Таймаут ожидания загрузки
       * @type {Number}
       */
      var loadTimeout;

      // Прячем плитку, чтобы избежать отображения момента их загрузки
      tileElement.classList.add('picture-hidden');

      // Обработка события onload, отключаем таймат загрузки и устанавливаем источник изображения
      tileImage.onload = function() {
        clearTimeout(loadTimeout);
        tileElement.querySelector('img').src = tileImage.src;
        tileElement.classList.remove('picture-hidden');
      };

      // Обработка события onerror, добавляем класс, стилизующий ошибку загрузки
      tileImage.onerror = function() {
        tileElement.classList.add('picture-load-failure');
        tileElement.classList.remove('picture-hidden');
      };

      // Установка таймаута для отмены загрузки изображения
      loadTimeout = setTimeout(function() {
        tileImage.src = '';
        tileElement.classList.add('picture-load-failure');
        tileElement.classList.remove('picture-hidden');
      }, IMAGE_LOAD_TIMEOUT);

      // Установка источника изображения для фото (url) и для видео (preview)
      tileImage.src = ('preview' in tile) ? tile.preview : tile.url;
    })();

    tileElement.querySelector('.picture-comments').textContent = tile.comments;
    tileElement.querySelector('.picture-likes').textContent = tile.likes;

    return tileElement;
  };

  /**
   * Рассчет количества плиток на одну страницу (с учетом первой страницы)
   * @param {boolean} isFirstPage
   * @returns {number}
   */
  var getTilesPerPage = function(page) {
    // главная форма приложения Кекстаграм
    var uploadForm = document.forms['upload-select-image'];

    // Ширина страницы равна ширине контейнеа, а вот высота - от высоты окна.
    // Для простоты рассчетов сразу округляем до величины, кратной размеру плитки
    var pageWidth = Math.floor(tilesContainer.clientWidth / TILE_WIDTH) * TILE_WIDTH;
    var pageHeight = Math.ceil(document.documentElement.clientHeight / TILE_HEIGHT) * TILE_HEIGHT;

    // рассчитываем видимую высоту формы приложения на заданной странице
    var uploadFormHeight = Math.max(Math.min(uploadForm.clientHeight - pageHeight * page, pageHeight), 0);

    // Рассчитываем, сколько плиток помещается по ширине и высоте
    var hCount = pageWidth / TILE_WIDTH;
    var vCount = pageHeight / TILE_HEIGHT;

    // Рассчитываем, сколько плиток занимает видимая часть главной формы приложения
    var uploadFormSize = Math.ceil(uploadFormHeight / TILE_HEIGHT) * Math.ceil(uploadForm.clientWidth / TILE_WIDTH);

    return hCount * vCount - uploadFormSize;
  };

  /**
   * Проверка, приблизился ли низ контейнера к низу экрана на величину половины плитки
   * @returns {boolean}
   */
  var isBottomReached = function() {
    var gap = TILE_HEIGHT / 2;
    var containerBottom = tilesContainer.getBoundingClientRect().bottom;
    var windowHeight = document.documentElement.clientHeight;
    return containerBottom < (windowHeight + gap);
  };

  /**
   * Проверка, отрисован ли весь массив плиток
   * @returns {boolean}
   */
  var isArrayDrawn = function() {
    return tilesCount >= filteredTilesArray.length;
  };

  /**
   * Отрисовка переданного массива плиток
   * @param {Array.<Object>} arr
   */
  var renderTilesArray = function(arr) {
    arr.forEach(function(tile) {
      // Добавление полностью настроенного клонрованного элемента в контейнер
      tilesContainer.appendChild(getTileElement(tile));
      // Увеличиваем счетчик отрисованных элементов
      tilesCount++;
    });
  };

  /**
   * Отрисовывает очередную страницу массива плиток в контейнер
   * @param {Array.<Object>} arr
   * @param {boolean} clear
   */
  var renderNextTilePage = function(clear) {
    // Если флаг офистки выставлен в true, то очищаем контейнер и обнуляем счетчики
    if (clear) {
      tilesContainer.innerHTML = '';
      pagesCount = 0;
      tilesCount = 0;
    }

    // Отрисовываем часть коллекции, начиная с последнего отрисованного в контейнере элемента в расчитанном количестве
    renderTilesArray(filteredTilesArray.slice(tilesCount, tilesCount + getTilesPerPage(pagesCount)));

    // Увеличиваем счетчик отрисованных страниц
    pagesCount++;
  };

  /**
   * Сортировка массива плиток
   * @param {string} sort
   * @param {Boolean} ascending
   */
  var sortTileArray = function(sort, ascending) {

    /**
     * Сортировка массива, возвращает новый массив
     * @param {Array.<Object>} arr
     * @returns {Array.<Object>}
     */
    var sortArray = function(arr) {
      /** @type {string} атрибут, по которому сортируем */
      var atr;

      /** @type {Object.<number, number>[]} мапированный массив с нормализованными данными для сортировки */
      var indexArr = [];

      /** @type {number} 1 или -1, множитель для задания направления сортировки */
      var order = (-!ascending || +ascending);

      // В зависимости от значения sort, выбираем атрибут, по которому будем вести сортировку
      switch (sort) {
        case SortType.NEW:
          atr = 'date';
          break;
        case SortType.DISCUSSED:
          atr = 'comments';
          break;
        default:
        case SortType.POPULAR:
          atr = 'likes';
          break;
      }

      // Мапируем массив значений, по которым будет осуществлятьс сортировка
      // Данная теника позволяет избежать манипуляций с большим массивом сложных объектов
      if (sort === SortType.NEW) {
        indexArr = arr.map(function(element, i) {
          return {'value': Date.parse(element[atr]), 'index': i};
        });
      } else {
        indexArr = arr.map(function(element, i) {
          return {'value': element[atr], 'index': i};
        });
      }

      indexArr.sort(function(a, b) {
        // Выполняем сортиовку массива значений, выбирая направление в зависимости от order
        return (a.value - b.value) * order;
      });

      // возвращаем новый массив объектов, в соответствии с отсортированным масивом значений
      return indexArr.map(function(element) {
        return arr[element.index];
      });
    };

    /**
     * Фильтрация массива
     * @param {Array.<Object>} arr
     * @returns {Array.<Object>}
     */
    var filterArray = function(arr) {
      var resultArray = arr.slice(0);

      // Выполняем фильтрацию исходного массива, если требуется, и возвращаем новый массив
      if (sort === SortType.NEW) {
        return resultArray.filter(function(element) {
          // филтрация по датам за последние 2 недели
          // return Date.parse(element.date) > (Date.now() - 14 * 24 * 60 * 60 * 1000);

          // поскольку данных за 2 недели мало, для красоты возвращает тру всегда))
          return element;
        });
      }

      return resultArray;
    };

    // фильтруем, а затем сортируем исходный массив, получая на выходе новый массив
    filteredTilesArray = sortArray(filterArray(tilesArray));

    // Отрисовываем отсортированный массив
    renderNextTilePage(REDRAW_PAGE);
  };

  /**
   * Пересчет количества отрисованных страниц и отрисовка недостающих плиток
   */
  var pagesRecount = function() {
    var pages = 0;
    var tiles = 0;

    do {
      // Вычисляем страницу, на которой отрисовано больше, либо столько же плиток как в счетчике pagesCount
      tiles += getTilesPerPage(pages);
      pages++;
    } while (tilesCount > tiles);

    // Обновляем счетчик страниц
    pagesCount = pages;

    // Отрисовываем недостающие на текущей транице плитки
    renderTilesArray(filteredTilesArray.slice(tilesCount, tiles));
  };

  /**
   * Отрисовка следующей страницы если достигнут низ экрана
   */
  var scrollRedraw = function() {
      // запускаем отрисовку массива, в случае, если низ страницы уже достигнут, а массив полностью ещё не отрисован
    if (isBottomReached() && !isArrayDrawn()) {
      renderNextTilePage();
    }
  };

  /**
   * обработчик изменения выбранного фильтра
   * @param {Event} evt
   */
  var tileFilterSet = function(evt) {
    if (evt.target.tagName === 'INPUT' && evt.target.type === 'radio') {
      // Если новая сортировка соответствует установленной, то сортируем в обратном порядке
      sortType.ascending = (sortType.type === evt.target.value) && !sortType.ascending;
      sortType.type = evt.target.value;

      // сортируем и отрисовываем массив
      sortTileArray(sortType.type, sortType.ascending);
    }
  };

  /**
   * Загружает данные о плитках по http
   * @param {string} url
   */
  var loadTilesData = function(url) {
    var xhr = new XMLHttpRequest();

    // обработка события прогресс
    var xhrOnProgress = function() {
      tilesContainer.classList.add('pictures-loading');
    };

    // обработка события "ошибка" или "таймаут"
    var xhrOnError = function() {
      tilesContainer.classList.remove('pictures-loading');
      tilesContainer.classList.add('pictures-failure');

      // удаление класса для отображения ошибки с задержкой
      setTimeout(function() {
        tilesContainer.classList.remove('pictures-failure');
      }, 1000);
    };

    // обработка события загрузки
    var xhrOnLoad = function(evt) {
      // проверка, что данные загружены успешно
      var isError = !(evt.target.status === 200);

      if (!isError) {
        // обрабатываем случай ошибки парсинга полученных данных
        try {
          tilesArray = JSON.parse(evt.target.response);

          //  устанавливаем филтрацию по умолчанию и отрисовываем полученные данные
          tileFilterForm['filter'].value = DEFAULT_SORT_TYPE;
          sortTileArray(DEFAULT_SORT_TYPE);

          // Показываем фильтры только когда все плитки отрисованы
          tileFilterForm.classList.remove('hidden');

          // удаление класса для отображения статуса загрузки с задержкой
          setTimeout(function() {
            tilesContainer.classList.remove('pictures-loading');
          }, 100);

          // выход из функции, если всё успешно, иначе произойдет вызов обработчика ошибки
          return;
        } catch (err) {
          isError = true;
        }
      }

      // если исполнение дошло до сюда, то произошла ошибка
      xhrOnError();
    };

    // Прячем фильтры, если они показаны
    if (!tileFilterForm.classList.contains('hidden')) {
      tileFilterForm.classList.add('hidden');
    }

    // настраиваем запрос
    xhr.open('GET', url);
    xhr.timeout = 10000;

    // установка обработчиков
    xhr.onload = xhrOnLoad;
    xhr.onprogress = xhrOnProgress;
    xhr.onerror = xhrOnError;
    xhr.ontimeout = xhrOnError;

    // обработка полученных данных выполняеться обработчиком загрузки
    xhr.send();
  };

  // Проверка для старых браузеров, не поддерживающих template
  if ('content' in templateElement) {
    tileTemplate = templateElement.content.querySelector('.picture');
  } else {
    tileTemplate = templateElement.querySelector('.picture');
  }

  window.onresize = function() {
    // пересчёт количества отрисованных страниц и дорисовка плиток при необходимости
    pagesRecount();
  };

  window.onscroll = function() {
    // очистка раннее установленного таймера для
    clearTimeout(scrollTimeout);
    // запуск отрисовки спустя 100мс после окончания прокрутки
    scrollTimeout = setTimeout(scrollRedraw, 100);
  };

  // устанавливаем обработчики событий для фильтров
  tileFilterForm.onclick = tileFilterSet;
  tileFilterForm.onkeydown = function(evt) {
    if (evt.keyCode === 13 || evt.keyCode === 32) {
      tileFilterSet(evt);
    }
  };

  // загрузка данных о плитках по HTTP
  loadTilesData(DATA_LOAD_URL);
})();
