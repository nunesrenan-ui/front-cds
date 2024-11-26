import "./App.css";
import axios from "axios";
import moment from "moment";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale, // Importação da escala linear
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
} from "chart.js";

import { Pie, PolarArea } from "react-chartjs-2";

// Registre os componentes com o Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale, // Registro da escala linear
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const getRandomColor = () => {
  // Gera valores aleatórios para os componentes RGB
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  return `rgba(${r}, ${g}, ${b}, 0.6)`; // Retorna a cor em formato RGBA com opacidade
};

const SimpleChart = ({ labels, dados, title }) => {
  const data = {
    labels: [labels],
    datasets: [
      {
        label: "Semana epidemiológica",
        data: dados,
        backgroundColor: dados?.map(() => getRandomColor(5)),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: title,
      },
    },
  };

  return (
    <div style={{ width: "400px", height: "400px" }}>
      <Pie data={data} options={options} />
    </div>
  );
};

function App() {
  const [codigoIBGE, setCodigoIBGE] = useState(null);
  const [cidade, setCidade] = useState("---");
  const [data, setData] = useState({});

  const getData = async (geocode) => {
    if (!geocode) {
      return;
    }
    const today = moment();
    const lessOneMonth = moment().subtract(3, "month");
    const weekstart = lessOneMonth.isoWeek();
    const weekEnd = today.isoWeek();
    const yearStart = lessOneMonth.year();
    const yearEnd = today.year();

    // const proxyUrl = "https://thingproxy.freeboard.io/fetch/";
    const route = `https://precospublicosonline.com.br/api/data-dengue?geocode=${geocode}&disease=dengue&format=json&ew_start=${weekstart}&ew_end=${weekEnd}&ey_start=${yearStart}&ey_end=${yearEnd}`;

    const dados = await axios
      .get(route)
      .then((res) => {
        if (res.status === 200) {
          const agrupado = {};
          const semanas = [];
          const confirmados = [];
          const estimados = [];

          res.data.forEach((element) => {
            const str = `${element.SE}`;
            const year = str.substring(0, 4); // "2024"
            const week = str.substring(4);
            const formatted = `${week}-${year}`;
            semanas.push(formatted);

            confirmados.push(element.casprov);
            estimados.push(element.casos_est);

            agrupado.casos_est = element.casos_est;
            agrupado.casos_est_min = element.casos_est_min;
            agrupado.casos_est_max = element.casos_est_max;
            agrupado.casos = element.casos;
            agrupado.nivel = element.nivel;
            agrupado.tempmin = element.tempmin;
            agrupado.umidmax = element.umidmax;
            agrupado.receptivo = element.receptivo;
            agrupado.transmissao = element.transmissao;
            agrupado.nivel_inc = element.nivel_inc;
            agrupado.umidmed = element.umidmed;
            agrupado.umidmin = element.umidmin;
            agrupado.tempmed = element.tempmed;
            agrupado.tempmax = element.tempmax;
            agrupado.casprov = element.casprov;
            agrupado.notif_accum_year = element.notif_accum_year;
          });

          return {
            success: true,
            data: res.data,
            agrupado,
            semanas,
            confirmados,
            estimados,
          };
        }
      })

      .catch(() => ({ success: false }));

    setData(dados);
  };

  const buscarCEP = async (lat, lon) => {
    const route = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    return await axios
      .get(route)
      .then((res) => {
        if (res.status === 200) {
          return { success: true, data: res.data };
        }
      })
      .catch(() => ({ success: false }));
  };

  const buscarDadosCEP = async (cep) => {
    const route = `https://cep.awesomeapi.com.br/json/${cep}`;

    return await axios
      .get(route)
      .then((res) => {
        if (res.status === 200) {
          return { success: true, data: res.data };
        }
      })
      .catch(() => ({ success: false }));
  };

  const solicitarPermissao = async () => {
    // Verifica se a API de geolocalização está disponível no navegador
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada por este navegador.");
      return;
    }

    // Solicita a localização do usuário
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const res = await buscarCEP(latitude, longitude);

        if (res.success) {
          const dados = await buscarDadosCEP(
            res.data?.address?.postcode?.replace("-", "")
          );

          if (dados.success) {
            setCidade(dados.data.city);
            setCodigoIBGE(dados.data.city_ibge);
          }
        } else {
          alert("Não foi possível realizar a pesquisa");
        }

        console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
        // alert(`Localização obtida:\nLatitude: ${latitude}\nLongitude: ${longitude}`);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert("Você negou o acesso à localização.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Informações de localização indisponíveis.");
            break;
          case error.TIMEOUT:
            alert("A solicitação de localização expirou.");
            break;
          default:
            alert("Ocorreu um erro desconhecido.");
        }
      }
    );
  };

  useEffect(() => {
    solicitarPermissao();
  }, []);

  useEffect(() => {
    getData(codigoIBGE);
  }, [codigoIBGE]);

  return (
    <div className="App">
      <h1>Dengue nos últimos 90 dias em {cidade.toUpperCase()}!</h1>
      <header className="App-header">
        <div style={{ display: "flex" }}>
          <SimpleChart
            labels={data?.semanas}
            dados={data?.confirmados}
            title={"Casos confirmados"}
          />
          <SimpleChart
            labels={data?.semanas}
            dados={data?.estimados}
            title={"Casos estimados"}
          />
        </div>
        <div className="infos">
          <span>
            <b>CASOS:</b> {data?.agrupado?.casos}
          </span>
          <span>
            <b>CASOS ESTIMADOS:</b> {data?.agrupado?.casos_est}
          </span>
          <span>
            <b>CASOS ESTIMADO MÁX:</b> {data?.agrupado?.casos_est_max}
          </span>
          <span>
            <b>CASOS ESTIMADO MIN:</b> {data?.agrupado?.casos_est_min}
          </span>
          <span>
            <b>CASOS APROVADOS:</b> {data?.agrupado?.casprov}
          </span>
          <span>
            <b>NÍVEL DE TRANSMISSÃO:</b> {data?.agrupado?.nivel}
          </span>
          <span>
            <b>NOTIFICAÇÕES NO ANO:</b> {data?.agrupado?.notif_accum_year}
          </span>
          <span>
            <b>TEMP. MÁX:</b> {data?.agrupado?.tempmax}
          </span>
          <span>
            <b>TEMP. MED:</b> {data?.agrupado?.tempmed}
          </span>
          <span>
            <b>TEMP: MIN:</b> {data?.agrupado?.tempmin}
          </span>
          <span>
            <b>UMIDADE MÁX:</b> {data?.agrupado?.umidmax}
          </span>
          <span>
            <b>UMIDADE MED:</b> {data?.agrupado?.umidmed}
          </span>
          <span>
            <b>UMIDADE MIN:</b> {data?.agrupado?.umidmin}
          </span>
        </div>
      </header>
    </div>
  );
}

export default App;
