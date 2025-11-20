import { onValue, push, ref, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  Alert, FlatList,
  ListRenderItem,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text, TextInput,
  View
} from "react-native";
import { auth, database } from "../services/connectionFirebase";
// Importa os novos tipos: EstoqueSKU (antigo Lote) e RelatorioEstoque (antigo AlimentacaoRegistro)
import { EstoqueSKU, RelatorioEstoque } from "../../app/(tabs)";

// Os cálculos anteriores (taxa por peso/temperatura) são substituídos por lógica de estoque:
// A função de cálculo agora simula a geração de métricas de estoque.
const getStatusAnalise = (estoqueAtual: number): string => {
  if (estoqueAtual > 50) return "Estoque Alto";
  if (estoqueAtual > 0) return "Estoque Adequado";
  return "Estoque Crítico (0)";
};

// --- TELA PRINCIPAL (Antiga AlimentacaoScreen) ---
export default function RelatoriosEstoqueScreen() {
  const [estoque, setEstoque] = useState<EstoqueSKU[]>([]); // Antigos lotes agora são SKUs
  const [registros, setRegistros] = useState<RelatorioEstoque[]>([]); // Registros de Relatório
  const [selectedSKU, setSelectedSKU] = useState<EstoqueSKU | null>(null); // SKU Selecionado
  const [isSKUModalVisible, setIsSKUModalVisible] = useState(false);
  const user = auth.currentUser;

  // Estados da Calculadora/Análise de Estoque
  const [quantidadeVendida, setQuantidadeVendida] = useState('');
  const [quantidadeRecebida, setQuantidadeRecebida] = useState('');
  const [calculo, setCalculo] = useState<any>(null); // Armazena o resultado da análise

  // Estados do Registro Manual
  const [estoqueAtualizado, setEstoqueAtualizado] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Busca SKUs (antigos lotes) e registros de relatório
  useEffect(() => {
    if (!user) return;
    // Caminho do Firebase: 'lots' -> 'estoque'
    const estoqueRef = ref(database, `users/${user.uid}/estoque`);
    const unsubEstoque = onValue(estoqueRef, s => {
      setEstoque(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
    });

    let unsubRegistros = () => {};
    if (selectedSKU) {
      // Caminho do Firebase: 'alimentacao' -> 'relatoriosEstoque'
      const registrosRef = ref(database, `users/${user.uid}/relatoriosEstoque/${selectedSKU.id}`);
      unsubRegistros = onValue(registrosRef, s => {
        const data = s.val();
        // Ordena do mais recente para o mais antigo
        const loadedData = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        setRegistros(loadedData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
      });
    } else {
      setRegistros([]);
    }

    return () => {
      unsubEstoque();
      unsubRegistros();
    };
  }, [user, selectedSKU]);

  const handleSelectSKU = (sku: EstoqueSKU) => {
    setSelectedSKU(sku);
    // Limpa campos ao trocar de SKU
    setQuantidadeVendida('');
    setQuantidadeRecebida('');
    setCalculo(null);
    setEstoqueAtualizado(sku.quantidade.toString()); // Pré-preenche com o estoque atual
    setObservacoes('');
    setIsSKUModalVisible(false);
  };
  
  const handleCalcular = () => {
    if (!selectedSKU) {
      return Alert.alert("Atenção", "Selecione um SKU de estoque.");
    }

    const vendida = parseInt(quantidadeVendida) || 0;
    const recebida = parseInt(quantidadeRecebida) || 0;
    const estoqueAnterior = selectedSKU.quantidade;

    const estoqueFinalEstimado = (estoqueAnterior - vendida) + recebida;
    const status = getStatusAnalise(estoqueFinalEstimado);

    setCalculo({
      estoqueAnterior,
      recebida,
      vendida,
      estoqueFinalEstimado,
      status,
    });
  };

  const handleRegistrar = async () => {
    if (!user || !selectedSKU || !estoqueAtualizado) {
      return Alert.alert("Atenção", "Selecione um SKU e informe o estoque atualizado.");
    }
    
    // Calcula a diferença para saber o movimento
    const estoqueAnterior = selectedSKU.quantidade;
    const estoqueNovo = parseInt(estoqueAtualizado) || 0;
    const movimento = estoqueNovo - estoqueAnterior;
    
    if (movimento === 0 && observacoes === '') {
        return Alert.alert("Atenção", "Nenhuma mudança registrada.");
    }
    
    const newRegistroRef = push(ref(database, `users/${user.uid}/relatoriosEstoque/${selectedSKU.id}`));
    try {
      // 1. Registra o movimento/relatório
      await set(newRegistroRef, {
        data: new Date().toISOString(),
        skuId: selectedSKU.id,
        skuNome: selectedSKU.nomeProduto,
        quantidadeRecebida: movimento > 0 ? movimento : 0,
        quantidadeVendida: movimento < 0 ? Math.abs(movimento) : 0,
        estoqueAtual: estoqueNovo,
        observacoes: observacoes || (movimento > 0 ? `Recebido: ${movimento} pares` : movimento < 0 ? `Movimento de saída: ${Math.abs(movimento)} pares` : 'Ajuste de inventário (Qtde inalterada)'),
      });
      
      // 2. Atualiza a quantidade no SKU principal
      const skuRef = ref(database, `users/${user.uid}/estoque/${selectedSKU.id}`);
      await update(skuRef, { 
          quantidade: estoqueNovo,
          updatedAt: new Date().toISOString()
      });
      
      Alert.alert("Sucesso", "Movimento de estoque registrado e SKU atualizado!");
      setEstoqueAtualizado(estoqueNovo.toString());
      setObservacoes('');
      setCalculo(null);

    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar o registro.");
    }
  };
  
  const renderRegistroItem: ListRenderItem<RelatorioEstoque> = ({ item }) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemTitle}>{new Date(item.data).toLocaleDateString('pt-BR')} - {new Date(item.data).toLocaleTimeString('pt-BR')}</Text>
      
      <View style={styles.metricsRow}>
        {item.quantidadeRecebida > 0 && 
            <Text style={[styles.detailText, {color: '#10B981', fontWeight: 'bold'}]}>+ {item.quantidadeRecebida} Recebidos</Text>
        }
        {item.quantidadeVendida > 0 && 
            <Text style={[styles.detailText, {color: '#EF4444', fontWeight: 'bold'}]}>- {item.quantidadeVendida} Vendidos/Ajuste</Text>
        }
      </View>
      
      <Text style={styles.detailText}>Estoque Final: {item.estoqueAtual} pares</Text>
      {item.observacoes && <Text style={styles.detailText}>Obs: {item.observacoes}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Modal de Seleção de SKU */}
      <Modal visible={isSKUModalVisible} onRequestClose={() => setIsSKUModalVisible(false)} transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o SKU</Text>
            <FlatList data={estoque} keyExtractor={item => item.id} renderItem={({item}) => (
              <Pressable style={styles.modalItem} onPress={() => handleSelectSKU(item)}>
                <Text style={styles.modalItemTitle}>{item.nomeProduto} (Tam: {item.tamanho}, Cor: {item.cor})</Text>
                <Text style={styles.modalItemText}>Local: {item.nomeLoja} | Estoque: {item.quantidade}</Text>
              </Pressable>
            )} ListEmptyComponent={<Text>Nenhum SKU ativo. Crie um na tela Estoque.</Text>}/>
            <Pressable style={styles.modalCloseButton} onPress={() => setIsSKUModalVisible(false)}><Text style={styles.buttonText}>Cancelar</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Text style={styles.title}>Relatórios de Estoque</Text>

      <Pressable style={styles.selectButton} onPress={() => setIsSKUModalVisible(true)}>
        <Text style={styles.selectButtonText}>
          {selectedSKU ? `${selectedSKU.nomeProduto} - Tam: ${selectedSKU.tamanho}, Cor: ${selectedSKU.cor}` : "Selecione um SKU *"}
        </Text>
      </Pressable>

      {selectedSKU && (
        <>
          {/* Card da Calculadora */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Análise Rápida de Movimento</Text>
            <Text style={styles.detailText}>Estoque Atual: {selectedSKU.quantidade} pares</Text>

            <View style={styles.dimensionRow}>
              <TextInput 
                style={[styles.input, styles.dimensionInput]} 
                placeholder="Saída/Venda (pares)" 
                value={quantidadeVendida} 
                onChangeText={setQuantidadeVendida} 
                keyboardType="numeric"
              />
              <TextInput 
                style={[styles.input, styles.dimensionInput]} 
                placeholder="Entrada/Recebimento" 
                value={quantidadeRecebida} 
                onChangeText={setQuantidadeRecebida} 
                keyboardType="numeric"
              />
            </View>
            <Pressable style={styles.button} onPress={handleCalcular}><Text style={styles.buttonText}>Estimar Estoque Final</Text></Pressable>
          </View>
          
          {/* Card de Resultados */}
          {calculo && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Resultado da Estimativa</Text>
              <Text style={styles.resultText}>Estoque Anterior: <Text style={styles.resultValue}>{calculo.estoqueAnterior} pares</Text></Text>
              <Text style={styles.resultText}>Movimento: <Text style={styles.resultValue}>+{calculo.recebida} | -{calculo.vendida} pares</Text></Text>
              <Text style={styles.resultText}>Estoque Final Estimado: <Text style={[styles.resultValue, {color: calculo.estoqueFinalEstimado > 0 ? '#10B981' : '#EF4444'}]}>{calculo.estoqueFinalEstimado} pares</Text></Text>
              <Text style={styles.resultText}>Status: <Text style={styles.resultValue}>{calculo.status}</Text></Text>
            </View>
          )}

          {/* Card de Registro */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ajustar / Registrar Movimento</Text>
            <View style={styles.dimensionRow}>
              <TextInput 
                style={[styles.input, styles.dimensionInput]} 
                placeholder={`Estoque Atual (Novo): ${selectedSKU.quantidade}`} 
                value={estoqueAtualizado} 
                onChangeText={setEstoqueAtualizado} 
                keyboardType="numeric"
              />
              <TextInput 
                style={[styles.input, styles.dimensionInput]} 
                placeholder="Observações (opcional)" 
                value={observacoes} 
                onChangeText={setObservacoes} 
              />
            </View>
            <Pressable 
                style={[styles.button, (!estoqueAtualizado) && styles.buttonDisabled]}
                onPress={handleRegistrar}
                disabled={!estoqueAtualizado}
            >
                <Text style={styles.buttonText}>Registrar Ajuste / Movimento</Text>
            </Pressable>
          </View>

          {/* Histórico */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Histórico de Movimento</Text>
            <FlatList data={registros} renderItem={renderRegistroItem} keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhum registro de movimento para este SKU.</Text>}
              scrollEnabled={false}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  dimensionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  dimensionInput: { flex: 1 },
  button: { backgroundColor: '#007BFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  selectButton: { borderWidth: 1, borderColor: '#007BFF', borderStyle: 'dashed', borderRadius: 8, padding: 15, marginBottom: 20, alignItems: 'center' },
  selectButtonText: { fontSize: 16, color: '#007BFF', fontWeight: 'bold' },
  resultText: { fontSize: 16, marginBottom: 8 },
  resultValue: { fontWeight: 'bold' },
  listItem: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10 },
  listItemTitle: { fontSize: 16, fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#6c757d' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#6c757d' },
  buttonDisabled: { backgroundColor: '#adb5bd' },
  // Estilos do Modal
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemTitle: { fontSize: 16, fontWeight: '500' },
  modalItemText: { fontSize: 14, color: '#6c757d' },
  modalCloseButton: { backgroundColor: '#6c757d', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
});