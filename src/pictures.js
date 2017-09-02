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
   * Массив данных о плитках для фона
   * @type {Array.<Object>}
   */
  var tilesArray = [];

  /**
   * Контейнер шаблонов элементов
   * @type {HTMLElement}
   */
  var tileTemplate;

  /**
   * Шаблон плитки
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
   * Отрисовывает коллекцию плиток в контейнер
   * @param {Array.<Object>} arr
   */
  var renderTilesCollection = function(arr) {
    // Проверка, что фильтры спрятаны, иначе прячем
    if (!tileFilterForm.classList.contains('hidden')) {
      tileFilterForm.classList.add('hidden');
    }

    // очистка контейнера
    tilesContainer.innerHTML = '';

    arr.forEach(function(tile) {
      // Добавление полностью настроенного клонрованного элемента в контейнер
      tilesContainer.appendChild(getTileElement(tile));
    });

    // Показываем фильтры только когда все плитки отрисованы
    tileFilterForm.classList.remove('hidden');
  };

  /**
   * Сортировка массива плиток
   * @param {string} sort
   * @returns {Array.<Object>}
   */
  var sortTileArray = function(sort) {
    var arr = tilesArray.slice(0);

    switch (sort) {
      case 'popular':
        // возвращаем исодный массив
        arr = tilesArray;
        break;
      case 'new':
        arr = arr.sort(function(a, b) {
          // сортировка даты по убыванию
          return new Date(b.date) - new Date(a.date);
        }).filter(function(tile) {
          // филтрация по датам за последние 2 недели
          // return new Date(tile.date) > (Date.now() - 14 * 24 * 60 * 60 * 1000);
          // поскольку данных за 2 недели мало, для красоты возвращает тру всегда))
          return tile;
        });
        break;
      case 'discussed':
        arr.sort(function(a, b) {
          // сортировка каментов по убыванию
          return b.comments - a.comments;
        });
        break;
    }

    return arr;
  };

  /**
   * обработчик изменения выбранного фильтра
   * @param {Event} evt
   */
  var tileFilterChange = function(evt) {
    // отрисовываем осортированнй нужным образом массив
    renderTilesCollection(sortTileArray(evt.target.value));
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

    // обработка события ошибка или таймаут
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
          // отрисовываем полученные данные
          renderTilesCollection(tilesArray);

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

  // устанавливаем обработчик для фильтров
  tileFilterForm.onchange = tileFilterChange;

  // загрузка данных о плитках по HTTP
  loadTilesData(DATA_LOAD_URL);
})();
