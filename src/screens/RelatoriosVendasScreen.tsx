import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ListRenderItem,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text, TextInput,
  View
} from "react-native";
// Importa os novos tipos: EstoqueSKU (antigo Lote) e Venda (antigo Pedido)
import { EstoqueSKU } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');

// Interface para análise de vendas (baseada na antiga BiometriaCompleta)
interface VendaAnalise {
  id: string;
  data: string;
  vendaId: string;
  skuNome: string;
  margemBruta: number; // Lucro
  taxaMargem: number; // Margem / Venda
  unidadesVendidas: number;
  custoUnitario: number;
  precoVenda: number;
  observacoes: string;
}

export default function RelatoriosVendasScreen() {
  const [estoque, setEstoque] = useState<EstoqueSKU[]>([]); // SKUs (antigos lotes)
  const [registros, setRegistros] = useState<VendaAnalise[]>([]); // Registros de Análise
  const [selectedSKU, setSelectedSKU] = useState<EstoqueSKU | null>(null); // SKU Selecionado
  const [isSKUModalVisible, setIsSKUModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ultimaAnalise, setUltimaAnalise] = useState<VendaAnalise | null>(null);
  const user = auth.currentUser;

  // Estados do Formulário de Análise
  const [precoVenda, setPrecoVenda] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [unidadesVendidas, setUnidadesVendidas] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ultimoCalculo, setUltimoCalculo] = useState<any>(null);
  
  // Busca SKUs (antigos lotes) e registros de relatórios
  useEffect(() => {
    if (!user) return;
    
    // Caminho do Firebase: 'lots' -> 'estoque'
    const estoqueRef = ref(database, `users/${user.uid}/estoque`);
    const unsubEstoque = onValue(estoqueRef, s => {
      setEstoque(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
    });

    let unsubRegistros = () => {};
    if (selectedSKU) {
      setLoading(true);
      // Caminho do Firebase: 'biometria' -> 'relatoriosVendas'
      const registrosRef = ref(database, `users/${user.uid}/relatoriosVendas/${selectedSKU.id}`);
      unsubRegistros = onValue(registrosRef, s => {
        const data = s.val();
        const loadedData = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        const sortedData = loadedData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setRegistros(sortedData);
        setUltimaAnalise(sortedData.length > 0 ? sortedData[0] : null);
        setLoading(false);
      });
    } else {
      setRegistros([]);
      setUltimaAnalise(null);
      setLoading(false);
    }

    return () => { unsubEstoque(); unsubRegistros(); };
  }, [user, selectedSKU]);

  const handleSelectSKU = (sku: EstoqueSKU) => {
    setSelectedSKU(sku);
    // Limpa campos e pré-preenche com o preço base do produto se disponível
    setPrecoVenda(sku.nomeProduto.includes('Air Max') ? '650.00' : '400.00'); // Simulação de preço
    setCustoUnitario('200.00'); // Simulação de custo
    setUnidadesVendidas('');
    setObservacoes('');
    setUltimoCalculo(null);
    setIsSKUModalVisible(false);
  };

  const calcularMetricas = (preco: number, custo: number, unidades: number) => {
    if (unidades === 0) return null;

    const receitaTotal = preco * unidades;
    const custoTotal = custo * unidades;
    const margemBruta = receitaTotal - custoTotal;
    const taxaMargem = (margemBruta / receitaTotal) * 100;
    
    // Simulação de Desempenho
    let desempenho = '';
    if (taxaMargem >= 50) {
      desempenho = 'Excelente (Alta Margem)';
    } else if (taxaMargem >= 30) {
      desempenho = 'Bom (Margem Saudável)';
    } else {
      desempenho = 'Atenção (Baixa Margem)';
    }

    return {
      precoVenda,
      custoUnitario,
      margemBruta,
      taxaMargem,
      receitaTotal,
      custoTotal,
      desempenho,
      unidadesVendidas: unidades
    };
  };

  const handleCalcular = () => {
    if (!selectedSKU || !precoVenda || !custoUnitario || !unidadesVendidas) {
      return Alert.alert("Atenção", "Selecione um SKU e preencha todos os campos de valor.");
    }

    const preco = parseFloat(precoVenda.replace(',', '.'));
    const custo = parseFloat(custoUnitario.replace(',', '.'));
    const unidades = parseInt(unidadesVendidas);

    if(isNaN(preco) || isNaN(custo) || isNaN(unidades) || unidades === 0) {
      return Alert.alert("Erro", "Valores de entrada inválidos.");
    }
    
    if (custo >= preco) {
        return Alert.alert("Erro de Custo", "O Preço de Venda deve ser maior que o Custo Unitário.");
    }

    const metricas = calcularMetricas(preco, custo, unidades);
    if (metricas) {
      setUltimoCalculo(metricas);
    }
  };

  const handleSalvarAnalise = async () => {
    if (!selectedSKU || !ultimoCalculo) {
      return Alert.alert("Atenção", "Calcule primeiro as métricas antes de salvar.");
    }
    
    if(!user) return;

    setLoading(true);
    // Caminho do Firebase: 'biometria' -> 'relatoriosVendas'
    const newRegistroRef = push(ref(database, `users/${user.uid}/relatoriosVendas/${selectedSKU.id}`));
    
    try {
      await set(newRegistroRef, {
        data: new Date().toISOString(),
        vendaId: 'SIMULACAO-' + Date.now(), // ID da Venda simulada
        skuId: selectedSKU.id,
        skuNome: `${selectedSKU.nomeProduto} - Tam ${selectedSKU.tamanho} - ${selectedSKU.cor}`,
        precoVenda: parseFloat(precoVenda.replace(',', '.')),
        custoUnitario: parseFloat(custoUnitario.replace(',', '.')),
        margemBruta: ultimoCalculo.margemBruta,
        taxaMargem: ultimoCalculo.taxaMargem,
        unidadesVendidas: ultimoCalculo.unidadesVendidas,
        observacoes,
      });
      
      Alert.alert("Sucesso", "Análise de Vendas registrada!");
      
      // Limpa o formulário
      setUnidadesVendidas('');
      setObservacoes('');
      setUltimoCalculo(null);

    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar a análise.");
    } finally {
      setLoading(false);
    }
  };

  const getMargemColor = (margem: number) => {
    if (margem >= 50) return '#10B981';
    if (margem >= 30) return '#F59E0B';
    return '#EF4444';
  };

  const renderRegistroItem: ListRenderItem<VendaAnalise> = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemTitle}>Análise de {new Date(item.data).toLocaleDateString('pt-BR')}</Text>
        <Text style={styles.listItemSubtitle}>Margem: <Text style={{color: getMargemColor(item.taxaMargem)}}>{item.taxaMargem.toFixed(1)}%</Text></Text>
      </View>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Unidades</Text>
          <Text style={styles.metricValue}>{item.unidadesVendidas}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Lucro Bruto</Text>
          <Text style={styles.metricValue}>R$ {item.margemBruta.toFixed(2)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Custo Unitário</Text>
          <Text style={styles.metricValue}>R$ {item.custoUnitario.toFixed(2)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Preço Venda</Text>
          <Text style={styles.metricValue}>R$ {item.precoVenda.toFixed(2)}</Text>
        </View>
      </View>

      {item.observacoes ? (
        <Text style={styles.observacoesText}>Obs: {item.observacoes}</Text>
      ) : null}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Modal de Seleção de SKU */}
      <Modal visible={isSKUModalVisible} animationType="slide" onRequestClose={() => setIsSKUModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecione o Produto (SKU)</Text>
            <Pressable onPress={() => setIsSKUModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>
          <FlatList 
            data={estoque} 
            keyExtractor={item => item.id} 
            renderItem={({item}) => (
              <Pressable style={styles.modalItem} onPress={() => handleSelectSKU(item)}>
                <View style={styles.modalItemContent}>
                  <Text style={styles.modalItemText}>{item.nomeProduto} - Tam: {item.tamanho}, Cor: {item.cor}</Text>
                  <Text style={styles.modalItemSubtext}>Estoque: {item.quantidade} pares</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </Pressable>
            )} 
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum SKU em estoque. Crie um na tela de Estoque.</Text>
            }
          />
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.title}>Análise de Desempenho (Vendas)</Text>
        <Text style={styles.subtitle}>Calcule e registre margem de lucro por SKU</Text>
      </View>

      {/* Card de Seleção de SKU */}
      <Pressable style={styles.selectCard} onPress={() => setIsSKUModalVisible(true)}>
        <View style={styles.selectCardContent}>
          <Ionicons name="pricetags-outline" size={24} color="#0EA5E9" />
          <View style={styles.selectCardText}>
            <Text style={styles.selectCardTitle}>
              {selectedSKU ? selectedSKU.nomeProduto : "Selecionar Produto SKU"}
            </Text>
            <Text style={styles.selectCardSubtitle}>
              {selectedSKU ? `Tam: ${selectedSKU.tamanho}, Cor: ${selectedSKU.cor} | Estoque: ${selectedSKU.quantidade}` : "Toque para selecionar um SKU de estoque"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#94A3B8" />
        </View>
      </Pressable>

      {selectedSKU && (
        <>
          {/* Card de Entrada de Dados */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Simulação de Vendas</Text>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>Métricas</Text>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Preço de Venda (R$)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 500.00" 
                  value={precoVenda} 
                  onChangeText={setPrecoVenda} 
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Custo Unitário (R$)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 250.00" 
                  value={custoUnitario} 
                  onChangeText={setCustoUnitario} 
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unidades Vendidas (Simulação)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: 50 pares" 
                  value={unidadesVendidas} 
                  onChangeText={setUnidadesVendidas} 
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Custo/Preço (Automático)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="0.50" 
                  value={(parseFloat(custoUnitario) / parseFloat(precoVenda)).toFixed(2)} 
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Observações da Análise</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Anotações importantes..." 
                value={observacoes} 
                onChangeText={setObservacoes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.buttonRow}>
              <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleCalcular}>
                <Text style={styles.secondaryButtonText}>Calcular Margens</Text>
              </Pressable>
              <Pressable 
                style={[styles.button, styles.primaryButton, (!ultimoCalculo || loading) && styles.buttonDisabled]} 
                onPress={handleSalvarAnalise}
                disabled={!ultimoCalculo || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Salvar Análise</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Card de Resultados */}
          {ultimoCalculo && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Resultados da Simulação</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>Resultado</Text>
                </View>
              </View>

              <View style={styles.resultsGrid}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Receita Total</Text>
                  <Text style={styles.resultValue}>R$ {ultimoCalculo.receitaTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Custo Total</Text>
                  <Text style={styles.resultValue}>R$ {ultimoCalculo.custoTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Lucro Bruto</Text>
                  <Text style={styles.resultValue}>R$ {ultimoCalculo.margemBruta.toFixed(2)}</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Taxa de Margem</Text>
                  <Text style={[styles.resultValue, { color: getMargemColor(ultimoCalculo.taxaMargem) }]}>
                    {ultimoCalculo.taxaMargem.toFixed(1)}%
                  </Text>
                </View>
                <View style={[styles.resultItem, {width: width - 52}]}>
                  <Text style={styles.resultLabel}>Desempenho Estimado</Text>
                  <Text style={[styles.resultValue, { color: getMargemColor(ultimoCalculo.taxaMargem) }]}>
                    {ultimoCalculo.desempenho}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Card de Histórico */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Histórico de Análises</Text>
              <Text style={styles.cardSubtitle}>{registros.length} análises</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#0EA5E9" style={styles.loading} />
            ) : (
              <FlatList 
                data={registros} 
                renderItem={renderRegistroItem} 
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Nenhuma análise registrada para este SKU.</Text>
                }
              />
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc", 
    padding: 16 
  },
  header: {
    marginBottom: 24,
    paddingTop: 8,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
  },
  
  // Card de Seleção
  selectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  selectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectCardText: {
    flex: 1,
    marginLeft: 12,
  },
  selectCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  selectCardSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  // Cards Gerais
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  cardBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Botões
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#0EA5E9',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },

  // Resultados
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultItem: {
    width: (width - 72) / 2,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },

  // Lista de Registros
  listItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metricItem: {
    minWidth: 80,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  observacoesText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#64748B',
  },

  // Utilitários
  loading: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    marginVertical: 20,
  },
});