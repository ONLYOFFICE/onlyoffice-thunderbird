/**
 *
 * (c) Copyright Ascensio System SIA 2025
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
export const EVENTS = {
  FILE_OPEN: 'file:open',
  FILE_DOWNLOAD: 'file:download',
};

export const ACTIONS = {
  GET_ATTACHMENT_DATA: 'getAttachmentData',
  GET_COMPOSE_DETAILS: 'getComposeDetails',
  GET_MESSAGE_DATA: 'getMessageData',
  GET_USER_INFO: 'getUserInfo',
  SAVE_COMPOSE_ATTACHMENT: 'saveComposeAttachment',
};

export const FORMAT_ACTIONS = {
  EDIT: 'edit',
  VIEW: 'view',
  REVIEW: 'review',
  COMMENT: 'comment',
  FILL: 'fill',
  ENCRYPT: 'encrypt',
  LOSSY_EDIT: 'lossy-edit',
  AUTO_CONVERT: 'auto-convert',
  CUSTOM_FILTER: 'customfilter',
};

export const WINDOW_KEYS = {
  MESSAGE: 'msg_',
  COMPOSE: 'compose_',
};
