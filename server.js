// backend/server.js

const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors({ origin: '*' }));

// --- FUNÇÕES DE AUTENTICAÇÃO E ACESSO À PLANILHA ---
async function getGoogleSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// IDs das Planilhas
const spreadsheetId_data = '1EkLUvQ3l8gAnim89pjDDn8BHBFlilywY7drj2b7N1cE';
const spreadsheetId_users = '1J_bwtyK-3Z9jPy8Bp4u8IdJ9_9iE80J7fWg1yae7lO8';
const spreadsheetId_stock = '1fjeYInwN2zScgIPPyJcfJ8z7i1N3QJQbShE-EwKDdRA';

// --- ROTAS DO MÓDULO FINANCEIRO (Omitido) ---
// ... (código existente)
// --- ROTAS DE LEITURA (GET) - MÓDULO FINANCEIRO ---
app.get('/api/events', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_data, range: 'Eventos!A2:A' });
        const rows = response.data.values || [];
        const events = rows.flat();
        res.status(200).json(events);
    } catch (error) {
        console.error('Erro ao buscar dados de eventos:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar eventos.' });
    }
});
app.get('/api/waiters', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_data, range: 'Garçons!A2:B' });
        const rows = response.data.values || [];
        const waiters = rows.map(row => ({ cpf: row[0], name: row[1] }));
        res.status(200).json(waiters);
    } catch (error) {
        console.error('Erro ao buscar dados de garçons:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar garçons.' });
    }
});
app.get('/api/cashiers', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_data, range: 'Caixas!A2:B' });
        const rows = response.data.values || [];
        const cashiers = rows.map(row => ({ cpf: row[0], name: row[1] }));
        res.status(200).json(cashiers);
    } catch (error) {
        console.error('Erro ao buscar dados de caixas:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar caixas.' });
    }
});
app.get('/api/users', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_users, range: 'Logins!A2:E' });
        const rows = response.data.values || [];
        const users = rows.map(row => ({
            cpf: row[0], name: row[1], dob: row[2],
            profile: (row[3] || 'default').trim(),
            permissions: (row[4] || '').trim()
        }));
        res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao buscar dados de usuários:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar usuários.' });
    }
});
const parseValue = (value) => {
    if (!value || typeof value !== 'string') return 0;
    const numberString = value.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(numberString) || 0;
};
app.get('/api/closings', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { eventName } = req.query;
        if (!eventName) {
            return res.status(400).json({ message: 'O nome do evento é obrigatório.' });
        }
        const waitersResponse = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_data, range: 'Fechamento Garçons!A:Q' });
        const waiterRows = waitersResponse.data.values || [];
        const waiterClosings = waiterRows.slice(1).filter(row => row[0] === eventName).map(row => ({
            type: 'waiter', eventName: row[0], protocol: row[1], timestamp: row[2], cpf: row[3], waiterName: row[4],
            valorTotal: parseValue(row[7]), credito: parseValue(row[8]), debito: parseValue(row[9]),
            pix: parseValue(row[10]), cashless: parseValue(row[11]), comissaoTotal: parseValue(row[12]),
            acertoLabel: row[13], valorAcerto: parseValue(row[14]), operatorName: row[16]
        }));
        const waiters10Response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_data, range: 'Fechamento Garçons 10%!A:Q' });
        const waiter10Rows = waiters10Response.data.values || [];
        const waiter10Closings = waiter10Rows.slice(1).filter(row => row[0] === eventName).map(row => ({
            type: 'waiter', eventName: row[0], protocol: row[1], timestamp: row[2], cpf: row[3], waiterName: row[4],
            valorTotal: parseValue(row[7]), credito: parseValue(row[8]), debito: parseValue(row[9]),
            pix: parseValue(row[10]), cashless: parseValue(row[11]), comissaoTotal: parseValue(row[12]),
            acertoLabel: row[13], valorAcerto: parseValue(row[14]), operatorName: row[16]
        }));
        const cashiersResponse = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_data, range: 'Fechamento Caixas!A:R' });
        const cashierRows = cashiersResponse.data.values || [];
        const cashierClosings = cashierRows.slice(1).filter(row => row[0] === eventName).map(row => ({
            type: 'cashier', eventName: row[0], protocol: row[1], timestamp: row[2], cpf: row[3], cashierName: row[4],
            valorTotalVenda: parseValue(row[8]), credito: parseValue(row[9]), debito: parseValue(row[10]),
            pix: parseValue(row[11]), cashless: parseValue(row[12]), dinheiroFisico: parseValue(row[13]),
            diferenca: parseValue(row[15]), operatorName: row[17]
        }));
        const allClosings = [...waiterClosings, ...waiter10Closings, ...cashierClosings];
        allClosings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.status(200).json(allClosings);
    } catch (error) {
        console.error('Erro ao buscar histórico de fechamentos:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar histórico.' });
    }
});
// ...

// --- ROTAS DO MÓDULO DE ESTOQUE ---
app.get('/api/stock/inventory', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Inventario!A:G' });
        const rows = response.data.values || [];
        const products = rows.slice(1).map(row => ({
            productId: row[0], productName: row[1],
            unitsPerBox: parseInt(row[2], 10) || 0,
            boxStock: parseInt(row[3], 10) || 0,
            unitStock: parseInt(row[4], 10) || 0,
            dateAdded: row[5],
            lastVerified: row[6] || null,
        })).sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
        res.status(200).json(products);
    } catch (error) {
        console.error('Erro ao buscar inventário:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do inventário.' });
    }
});

app.post('/api/stock/inventory', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { productName, unitsPerBox, boxStock, unitStock } = req.body;
        if (!productName || !unitsPerBox) {
            return res.status(400).json({ message: 'Nome do produto e unidades por caixa são obrigatórios.' });
        }
        const newRow = [ `PROD-${Date.now()}`, productName, unitsPerBox, boxStock || 0, unitStock || 0, new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), null ];
        await googleSheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId_stock, range: 'Inventario',
            valueInputOption: 'USER_ENTERED', resource: { values: [newRow] },
        });
        res.status(201).json({ message: 'Produto cadastrado com sucesso!', productName });
    } catch (error) {
        console.error('Erro ao salvar produto no inventário:', error);
        res.status(500).json({ message: 'Erro ao salvar produto.' });
    }
});

app.post('/api/stock/inventory/update', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { productId, newBoxStock, newUnitStock, operatorName } = req.body;
        
        const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Inventario!A:G' });
        const rows = response.data.values || [];
        const productIndex = rows.findIndex(row => row[0] === productId);

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Produto não encontrado para atualização.' });
        }

        const productRow = rows[productIndex];
        const productName = productRow[1];
        const oldBoxStock = productRow[3];
        const oldUnitStock = productRow[4];
        const dateAdded = productRow[5];
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        const historyRow = [ now, productId, productName, oldBoxStock, oldUnitStock, newBoxStock, newUnitStock, operatorName ];
        await googleSheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId_stock, range: 'HistoricoInventario',
            valueInputOption: 'USER_ENTERED', resource: { values: [historyRow] },
        });

        const rangeToUpdate = `Inventario!D${productIndex + 1}:G${productIndex + 1}`;
        await googleSheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId_stock, range: rangeToUpdate,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[newBoxStock, newUnitStock, dateAdded, now]] }
        });

        res.status(200).json({ message: 'Estoque atualizado com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar inventário:', error);
        res.status(500).json({ message: 'Erro ao atualizar inventário.' });
    }
});

app.get('/api/stock/registrations', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const response = await googleSheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId_stock,
            range: 'Cadastros!A:J',
        });
        const rows = response.data.values || [];
        const registrations = rows.slice(1).map(row => ({
            id: row[0], type: row[1], name: row[2],
            doc: row[3], contact: row[4], responsibleName: row[5],
            plate: row[6], city: row[7], notes: row[8],
        })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        res.status(200).json(registrations);
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
        res.status(500).json({ message: 'Erro ao buscar dados de cadastros.' });
    }
});

app.post('/api/stock/registrations', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { type, name, doc, contact, responsibleName, plate, city, notes } = req.body;
        
        const newRow = [
            `CAD-${Date.now()}`, type, name,
            doc || null, contact || null, responsibleName || null,
            plate || null, city || null, notes || null,
            new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        ];

        await googleSheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId_stock,
            range: 'Cadastros',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] },
        });
        res.status(201).json({ message: 'Cadastro salvo com sucesso!', name });
    } catch (error) {
        console.error('Erro ao salvar cadastro:', error);
        res.status(500).json({ message: 'Erro ao salvar cadastro.' });
    }
});

app.put('/api/stock/registrations/:id', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { id } = req.params;
        const { type, name, doc, contact, responsibleName, plate, city, notes } = req.body;

        const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Cadastros!A:J' });
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ message: 'Cadastro não encontrado.' });
        }

        const updatedRow = [ id, type, name, doc || null, contact || null, responsibleName || null, plate || null, city || null, notes || null, rows[rowIndex][9] ];
        
        const rangeToUpdate = `Cadastros!A${rowIndex + 1}:J${rowIndex + 1}`;
        await googleSheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId_stock, range: rangeToUpdate,
            valueInputOption: 'USER_ENTERED', resource: { values: [updatedRow] }
        });

        res.status(200).json({ message: 'Cadastro atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar cadastro:', error);
        res.status(500).json({ message: 'Erro ao atualizar cadastro.' });
    }
});

app.delete('/api/stock/registrations/:id', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { id } = req.params;

        const response = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Cadastros!A:A' });
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) {
            return res.status(404).json({ message: 'Cadastro não encontrado para exclusão.' });
        }
        
        const sheetId = 0; // Assumindo que 'Cadastros' é a primeira aba (ID 0)
        await googleSheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId_stock,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1
                        }
                    }
                }]
            }
        });
        
        res.status(200).json({ message: 'Cadastro excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir cadastro:', error);
        res.status(500).json({ message: 'Erro ao excluir cadastro.' });
    }
});

app.post('/api/stock/movements', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { type, registrationId, notes, operatorName, products, returnDate } = req.body;

        const inventoryResponse = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Inventario!A:G' });
        const inventoryRows = inventoryResponse.data.values || [];
        
        const registrationsResponse = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Cadastros!A:J' });
        const registrationRows = registrationsResponse.data.values || [];
        const registration = registrationRows.find(row => row && row[0] === registrationId);
        if (!registration) return res.status(404).json({ message: 'Cadastro (cliente/fornecedor/evento) não encontrado.' });
        
        const registrationName = registration[2];
        const registrationDoc = registration[3];

        let updatedInventoryMap = {};
        let newMovementRows = [];
        const date = new Date();
        const transactionId = `MOV-${date.getTime()}`;
        const isEntry = type.includes('COMPRA') || type.includes('RETORNO');

        for (const product of products) {
            const productIndex = inventoryRows.findIndex(row => row && row[0] === product.productId);
            if (productIndex === -1) throw new Error(`Produto ${product.productName} não encontrado.`);
            
            const productRow = inventoryRows[productIndex];
            const unitsPerBox = parseInt(productRow[2], 10);
            let currentBoxStock = updatedInventoryMap[product.productId] ? updatedInventoryMap[product.productId].boxStock : parseInt(productRow[3], 10);
            let currentUnitStock = updatedInventoryMap[product.productId] ? updatedInventoryMap[product.productId].unitStock : parseInt(productRow[4], 10);
            const totalMovementUnits = (product.boxQuantity * unitsPerBox) + product.unitQuantity;

            if (isEntry) {
                currentUnitStock += totalMovementUnits;
                while (currentUnitStock >= unitsPerBox) {
                    currentBoxStock += 1;
                    currentUnitStock -= unitsPerBox;
                }
            } else { // Saída
                const totalCurrentUnits = (currentBoxStock * unitsPerBox) + currentUnitStock;
                if (totalMovementUnits > totalCurrentUnits) throw new Error(`Estoque insuficiente para ${product.productName}.`);
                currentUnitStock -= totalMovementUnits;
                while (currentUnitStock < 0) {
                    currentBoxStock -= 1;
                    currentUnitStock += unitsPerBox;
                }
            }
            
            updatedInventoryMap[product.productId] = { 
                newBoxStock: currentBoxStock, 
                newUnitStock: currentUnitStock,
                range: `Inventario!D${productIndex + 1}:E${productIndex + 1}`
            };
            
            newMovementRows.push([ transactionId, date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), type, product.productId, product.productName, registrationId, registrationName, product.boxQuantity, product.unitQuantity, notes, operatorName, returnDate || null ]);
        }

        const updateRequests = Object.values(updatedInventoryMap).map(update => ({
            range: update.range,
            values: [[update.newBoxStock, update.newUnitStock]]
        }));
        if (updateRequests.length > 0) {
            await googleSheets.spreadsheets.values.batchUpdate({
                spreadsheetId: spreadsheetId_stock,
                resource: { valueInputOption: 'USER_ENTERED', data: updateRequests }
            });
        }

        await googleSheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId_stock, range: 'Movimentacoes',
            valueInputOption: 'USER_ENTERED', resource: { values: newMovementRows },
        });
        
        // << INÍCIO DA CORREÇÃO >>
        const productsMap = new Map((inventoryRows || []).slice(1).map(row => [row[0], { unitsPerBox: parseInt(row[2], 10) || 0 }]));
        const productsWithDetails = products.map(p => ({
            ...p,
            unitsPerBox: productsMap.get(p.productId)?.unitsPerBox || 0,
        }));
        const details = { id: transactionId, date: date.toISOString(), type, registrationName, doc: registrationDoc, products: productsWithDetails, notes, operatorName, returnDate };
        // << FIM DA CORREÇÃO >>
        
        res.status(201).json({ message: `Movimentação registrada!`, details });
    } catch (error) {
        console.error('Erro ao processar movimentação:', error);
        res.status(500).json({ message: error.message || 'Erro ao processar a movimentação.' });
    }
});

app.post('/api/stock/returns', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { registrationId, eventId, eventName, notes, operatorName, products } = req.body;

        const inventoryResponse = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Inventario!A:G' });
        const inventoryRows = inventoryResponse.data.values || [];
        
        const registrationsResponse = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Cadastros!A:J' });
        const registrationRows = registrationsResponse.data.values || [];
        const registration = registrationRows.find(row => row && row[0] === registrationId);
        if (!registration) return res.status(404).json({ message: 'Cadastro (fornecedor) não encontrado.' });
        const registrationName = registration[2];
        const registrationDoc = registration[3];
        
        let updatedInventoryMap = {};
        let newReturnRows = [];
        const date = new Date();
        const returnId = `DEV-${date.getTime()}`;

        for (const product of products) {
            const productIndex = inventoryRows.findIndex(row => row && row[0] === product.productId);
            if (productIndex === -1) throw new Error(`Produto ${product.productName} não encontrado.`);
            
            const productRow = inventoryRows[productIndex];
            const unitsPerBox = parseInt(productRow[2], 10);
            let currentBoxStock = updatedInventoryMap[product.productId] ? updatedInventoryMap[product.productId].boxStock : parseInt(productRow[3], 10);
            let currentUnitStock = updatedInventoryMap[product.productId] ? updatedInventoryMap[product.productId].unitStock : parseInt(productRow[4], 10);
            const totalReturnedUnits = (product.boxQuantity * unitsPerBox) + product.unitQuantity;

            currentUnitStock += totalReturnedUnits;
            while (currentUnitStock >= unitsPerBox) {
                currentBoxStock += 1;
                currentUnitStock -= unitsPerBox;
            }
            
            updatedInventoryMap[product.productId] = { 
                newBoxStock: currentBoxStock, 
                newUnitStock: currentUnitStock,
                range: `Inventario!D${productIndex + 1}:E${productIndex + 1}`
            };
            
            newReturnRows.push([ returnId, date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), product.productId, product.productName, registrationId, registrationName, product.boxQuantity, product.unitQuantity, notes, operatorName, eventName ]);
        }

        const updateRequests = Object.values(updatedInventoryMap).map(update => ({
            range: update.range,
            values: [[update.newBoxStock, update.newUnitStock]]
        }));
        if (updateRequests.length > 0) {
            await googleSheets.spreadsheets.values.batchUpdate({
                spreadsheetId: spreadsheetId_stock,
                resource: { valueInputOption: 'USER_ENTERED', data: updateRequests }
            });
        }

        await googleSheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId_stock, range: 'Devolucoes',
            valueInputOption: 'USER_ENTERED', resource: { values: newReturnRows },
        });
        
        // << INÍCIO DA CORREÇÃO >>
        const productsMap = new Map((inventoryRows || []).slice(1).map(row => [row[0], { unitsPerBox: parseInt(row[2], 10) || 0 }]));
        const productsWithDetails = products.map(p => ({
            ...p,
            unitsPerBox: productsMap.get(p.productId)?.unitsPerBox || 0,
        }));
        const details = { id: returnId, date: date.toISOString(), type: 'DEVOLUÇÃO', registrationName, doc: registrationDoc, eventName, products: productsWithDetails, notes, operatorName };
        // << FIM DA CORREÇÃO >>

        res.status(201).json({ message: `Devolução registrada!`, details: details });
    } catch (error) {
        console.error('Erro ao processar devolução:', error);
        res.status(500).json({ message: error.message || 'Erro ao processar a devolução.' });
    }
});

app.get('/api/stock/audit', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        
        const parsePtBrDate = (dateString) => {
            if (!dateString || !dateString.includes('/')) return new Date(0);
            const [datePart, timePart] = dateString.split(', ');
            const [day, month, year] = datePart.split('/');
            return new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`);
        };

        const movementsRes = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Movimentacoes!A:L' });
        const movementRows = (movementsRes.data.values || []).slice(1);
        const movementLogs = movementRows.map(row => ({
            id: row[0], date: row[1], type: row[2], productName: row[4], registrationName: row[6],
            boxQuantity: row[7] || 0, unitQuantity: row[8] || 0, operator: row[10]
        }));

        const returnsRes = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Devolucoes!A:K' });
        const returnRows = (returnsRes.data.values || []).slice(1);
        const returnLogs = returnRows.map(row => ({
            id: row[0], date: row[1], type: 'DEVOLUÇÃO', productName: row[3], registrationName: row[5],
            boxQuantity: row[6] || 0, unitQuantity: row[7] || 0, operator: row[9]
        }));
        
        const historyRes = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'HistoricoInventario!A:H' });
        const historyRows = (historyRes.data.values || []).slice(1);
        const historyLogs = historyRows.map(row => ({
            id: `INV-${row[0]}`, date: row[0], type: 'INVENTÁRIO', productName: row[2], 
            registrationName: `De ${row[3]}cx/${row[4]}un para ${row[5]}cx/${row[6]}un`,
            boxQuantity: row[5], unitQuantity: row[6], operator: row[7]
        }));

        const allLogs = [...movementLogs, ...returnLogs, ...historyLogs];
        
        allLogs.sort((a, b) => parsePtBrDate(b.date) - parsePtBrDate(a.date));

        res.status(200).json(allLogs);

    } catch (error) {
        console.error('Erro ao buscar auditoria:', error);
        res.status(500).json({ message: 'Erro ao buscar dados de auditoria.' });
    }
});

app.get('/api/stock/transaction/:id', async (req, res) => {
    try {
        const googleSheets = await getGoogleSheetsClient();
        const { id } = req.params;
        const inventoryResponse = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Inventario!A:C' });
        const productsMap = new Map((inventoryResponse.data.values || []).slice(1).map(row => [row[0], { name: row[1], unitsPerBox: row[2] }]));
        
        const registrationsResponse = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Cadastros!A:J' });
        const registrationsMap = new Map((registrationsResponse.data.values || []).slice(1).map(row => [row[0], { name: row[2], doc: row[3], contact: row[4], plate: row[6] }]));

        let details = null;

        if (id.startsWith('DEV-')) {
            const returnsRes = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Devolucoes!A:K' });
            const transactionRows = (returnsRes.data.values || []).slice(1).filter(row => row[0] === id);
            if (transactionRows.length > 0) {
                const firstRow = transactionRows[0];
                const registrationDetails = registrationsMap.get(firstRow[4]) || {};
                details = {
                    id: firstRow[0], date: firstRow[1], type: 'DEVOLUÇÃO', 
                    registrationName: firstRow[5], ...registrationDetails,
                    eventName: firstRow[10], notes: firstRow[8], operatorName: firstRow[9],
                    products: transactionRows.map(row => ({
                        productName: `${row[3]}`, // Removido (cx...) para consistência
                        boxQuantity: row[6], unitQuantity: row[7],
                        unitsPerBox: parseInt(productsMap.get(row[2])?.unitsPerBox, 10) || 0
                    }))
                };
            }
        } else if (id.startsWith('MOV-')) {
            const movementsRes = await googleSheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId_stock, range: 'Movimentacoes!A:L' });
            const transactionRows = (movementsRes.data.values || []).slice(1).filter(row => row[0] === id);
            if (transactionRows.length > 0) {
                const firstRow = transactionRows[0];
                const registrationDetails = registrationsMap.get(firstRow[5]) || {};
                details = {
                    id: firstRow[0], date: firstRow[1], type: firstRow[2], 
                    registrationName: firstRow[6], ...registrationDetails,
                    notes: firstRow[9], operatorName: firstRow[10], returnDate: firstRow[11],
                    products: transactionRows.map(row => ({
                        productName: `${row[4]}`, // Removido (cx...) para consistência
                        boxQuantity: row[7], unitQuantity: row[8],
                        unitsPerBox: parseInt(productsMap.get(row[3])?.unitsPerBox, 10) || 0
                    }))
                };
            }
        }

        if (details) res.status(200).json(details);
        else res.status(404).json({ message: 'Transação não encontrada.' });
        
    } catch (error) {
        console.error('Erro ao buscar detalhes da transação:', error);
        res.status(500).json({ message: 'Erro ao buscar detalhes da transação.' });
    }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});