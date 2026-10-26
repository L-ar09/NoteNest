const { randomUUID } = require('node:crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const tableName = process.env.NOTES_TABLE_NAME;
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const response = (statusCode, payload) => ({
  statusCode,
  headers: {
    'access-control-allow-origin': process.env.CORS_ORIGIN,
    'content-type': 'application/json',
  },
  body: JSON.stringify(payload),
});

const getUserId = (event) => event.requestContext?.authorizer?.jwt?.claims?.sub;

const noteKey = (userId, noteId) => ({ PK: `USER#${userId}`, SK: `NOTE#${noteId}` });

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error('INVALID_JSON');
  }
};

const validateNoteInput = ({ title, content, tags }, { partial = false } = {}) => {
  const errors = [];
  if (!partial || title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 160) {
      errors.push('title must be a non-empty string no longer than 160 characters');
    }
  }
  if (!partial || content !== undefined) {
    if (typeof content !== 'string' || content.length > 50000) {
      errors.push('content must be a string no longer than 50000 characters');
    }
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags) || tags.length > 10 || tags.some((tag) => typeof tag !== 'string' || tag.length > 40)) {
      errors.push('tags must contain at most 10 strings, each no longer than 40 characters');
    }
  }
  return errors;
};

const requireUser = (event) => {
  const userId = getUserId(event);
  return userId ? null : response(401, { message: 'Unauthorized' });
};

exports.listNotes = async (event) => {
  const unauthorized = requireUser(event);
  if (unauthorized) return unauthorized;
  const userId = getUserId(event);
  const result = await documentClient.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :notePrefix)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':notePrefix': 'NOTE#' },
  }));
  const notes = (result.Items ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return response(200, { notes });
};

exports.createNote = async (event) => {
  const unauthorized = requireUser(event);
  if (unauthorized) return unauthorized;
  let input;
  try { input = parseBody(event); } catch { return response(400, { message: 'Request body must be valid JSON' }); }
  const errors = validateNoteInput(input);
  if (errors.length) return response(400, { message: 'Invalid note', errors });

  const userId = getUserId(event);
  const now = new Date().toISOString();
  const noteId = randomUUID();
  const note = {
    ...noteKey(userId, noteId),
    noteId,
    title: input.title.trim(),
    content: input.content,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await documentClient.send(new PutCommand({ TableName: tableName, Item: note }));
  return response(201, { note });
};

exports.getNote = async (event) => {
  const unauthorized = requireUser(event);
  if (unauthorized) return unauthorized;
  const noteId = event.pathParameters?.noteId;
  if (!noteId) return response(400, { message: 'noteId is required' });
  const result = await documentClient.send(new GetCommand({
    TableName: tableName,
    Key: noteKey(getUserId(event), noteId),
  }));
  return result.Item ? response(200, { note: result.Item }) : response(404, { message: 'Note not found' });
};

exports.updateNote = async (event) => {
  const unauthorized = requireUser(event);
  if (unauthorized) return unauthorized;
  const noteId = event.pathParameters?.noteId;
  if (!noteId) return response(400, { message: 'noteId is required' });
  let input;
  try { input = parseBody(event); } catch { return response(400, { message: 'Request body must be valid JSON' }); }
  const errors = validateNoteInput(input, { partial: true });
  const fields = ['title', 'content', 'tags'].filter((field) => input[field] !== undefined);
  if (errors.length || !fields.length) return response(400, { message: 'Invalid note update', errors: errors.length ? errors : ['provide title, content, or tags'] });

  const names = { '#updatedAt': 'updatedAt' };
  const values = { ':updatedAt': new Date().toISOString() };
  const assignments = ['#updatedAt = :updatedAt'];
  for (const field of fields) {
    names[`#${field}`] = field;
    values[`:${field}`] = field === 'title' ? input[field].trim() : input[field];
    assignments.push(`#${field} = :${field}`);
  }
  try {
    const result = await documentClient.send(new UpdateCommand({
      TableName: tableName,
      Key: noteKey(getUserId(event), noteId),
      UpdateExpression: `SET ${assignments.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    }));
    return response(200, { note: result.Attributes });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') return response(404, { message: 'Note not found' });
    throw error;
  }
};

exports.deleteNote = async (event) => {
  const unauthorized = requireUser(event);
  if (unauthorized) return unauthorized;
  const noteId = event.pathParameters?.noteId;
  if (!noteId) return response(400, { message: 'noteId is required' });
  try {
    await documentClient.send(new DeleteCommand({
      TableName: tableName,
      Key: noteKey(getUserId(event), noteId),
      ConditionExpression: 'attribute_exists(PK)',
    }));
    return { statusCode: 204, headers: { 'access-control-allow-origin': process.env.CORS_ORIGIN } };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') return response(404, { message: 'Note not found' });
    throw error;
  }
};
